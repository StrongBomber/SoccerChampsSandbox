package com.wsc.editor;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.view.ViewGroup;
import android.webkit.ValueCallback;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.InputStream;
import java.io.OutputStream;

/**
 * World Soccer Champs · In-Game Editor — APK kabuğu.
 *
 * Editör (HTML/CSS/JS) APK içindeki assets/ klasöründen gelir. Sayfa
 * http://127.0.0.1:<port>/ üzerinden servis edilir; böylece fetch(), localStorage
 * ve dosya seçiciler normal bir web origin'i gibi çalışır (file:// kısıtları yok).
 */
public class MainActivity extends Activity {

    private WebView web;
    private MiniServer server;

    private static final int REQ_EXPORT = 1001;
    private static final int REQ_IMPORT = 1002;

    private String pendingFileName = "wsc-kayit.json";
    private String pendingContent = "";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        String base;
        try {
            server = new MiniServer(getAssets());
            server.start();
            base = "http://127.0.0.1:" + server.getPort() + "/";
        } catch (Exception e) {
            // Sunucu açılamazsa file:// ile devam et (demo yedeği devreye girer)
            base = "file:///android_asset/";
        }

        web = new WebView(this);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(true);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setTextZoom(100);
        s.setMediaPlaybackRequiresUserGesture(true);

        web.setBackgroundColor(0xFF0B0B10);
        web.setLayoutParams(new ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        web.setWebViewClient(new WebViewClient());
        web.addJavascriptInterface(new Bridge(), "WSCAndroid");

        setContentView(web);
        web.loadUrl(base + "index.html");
    }

    /** Kısa bildirim (UI iş parçacığından çağrılmalı). */
    private void toast(String message) {
        android.widget.Toast.makeText(this, message, android.widget.Toast.LENGTH_SHORT).show();
    }

    /* ---------------- dosya köprüsü ---------------- */

    /** JS tarafından çağrılır: WSCAndroid.exportFile(name, text) */
    final class Bridge {
        @android.webkit.JavascriptInterface
        public void exportFile(String name, String content) {
            pendingFileName = (name == null || name.length() == 0) ? "wsc-kayit.json" : name;
            pendingContent = content == null ? "" : content;
            runOnUiThread(new Runnable() {
                @Override public void run() {
                    Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                    intent.addCategory(Intent.CATEGORY_OPENABLE);
                    intent.setType("application/json");
                    intent.putExtra(Intent.EXTRA_TITLE, pendingFileName);
                    try {
                        startActivityForResult(intent, REQ_EXPORT);
                    } catch (Exception e) {
                        toast("Dosya seçici açılamadı");
                    }
                }
            });
        }

        /** JS tarafından çağrılır: WSCAndroid.importFile() */
        @android.webkit.JavascriptInterface
        public void importFile() {
            runOnUiThread(new Runnable() {
                @Override public void run() {
                    Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                    intent.addCategory(Intent.CATEGORY_OPENABLE);
                    intent.setType("application/json");
                    intent.putExtra(Intent.EXTRA_MIME_TYPES, new String[] { "application/json", "text/plain", "*/*" });
                    try {
                        startActivityForResult(intent, REQ_IMPORT);
                    } catch (Exception e) {
                        toast("Dosya seçici açılamadı");
                    }
                }
            });
        }

        @android.webkit.JavascriptInterface
        public void toast(final String message) {
            runOnUiThread(new Runnable() {
                @Override public void run() {
                    android.widget.Toast.makeText(MainActivity.this, message,
                            android.widget.Toast.LENGTH_SHORT).show();
                }
            });
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (resultCode != RESULT_OK || data == null) return;
        Uri uri = data.getData();
        if (uri == null) return;

        if (requestCode == REQ_EXPORT) {
            try (OutputStream out = getContentResolver().openOutputStream(uri, "wt")) {
                if (out != null) {
                    out.write(pendingContent.getBytes("UTF-8"));
                    out.flush();
                }
                toast("Kayıt dışa aktarıldı");
            } catch (Exception e) {
                toast("Yazma hatası: " + e.getMessage());
            }
            return;
        }

        if (requestCode == REQ_IMPORT) {
            try (InputStream in = getContentResolver().openInputStream(uri)) {
                if (in == null) { toast("Dosya açılamadı"); return; }
                byte[] buf = new byte[8192];
                StringBuilder sb = new StringBuilder();
                int n;
                while ((n = in.read(buf)) > 0) sb.append(new String(buf, 0, n, "UTF-8"));
                String quoted = quote(sb.toString());
                web.evaluateJavascript("window.WSC_IMPORT_JSON(" + quoted + ")", new ValueCallback<String>() {
                    @Override public void onReceiveValue(String value) { /* yok say */ }
                });
            } catch (Exception e) {
                toast("Okuma hatası: " + e.getMessage());
            }
        }
    }

    /** Metni JS string literal'ine çevirir. */
    private static String quote(String s) {
        StringBuilder sb = new StringBuilder("\"");
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            switch (c) {
                case '"': sb.append("\\\""); break;
                case '\\': sb.append("\\\\"); break;
                case '\n': sb.append("\\n"); break;
                case '\r': sb.append("\\r"); break;
                case '\t': sb.append("\\t"); break;
                default:
                    if (c < 0x20) sb.append(String.format("\\u%04x", (int) c));
                    else sb.append(c);
            }
        }
        return sb.append('"').toString();
    }

    @Override
    public void onBackPressed() {
        if (web != null && web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onDestroy() {
        if (server != null) server.stop();
        if (web != null) {
            web.removeJavascriptInterface("WSCAndroid");
            web.destroy();
        }
        super.onDestroy();
    }
}
