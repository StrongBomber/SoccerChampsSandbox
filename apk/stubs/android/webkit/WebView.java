package android.webkit;
import android.content.Context;
import android.view.ViewGroup;
public class WebView extends ViewGroup {
    public WebView(Context ctx) {}
    public WebSettings getSettings() { return new WebSettings(); }
    public void addJavascriptInterface(Object obj, String name) {}
    public void removeJavascriptInterface(String name) {}
    public void setWebViewClient(WebViewClient client) {}
    public void setBackgroundColor(int color) {}
    public void loadUrl(String url) {}
    public boolean canGoBack() { return false; }
    public void goBack() {}
    public void destroy() {}
    public void evaluateJavascript(String script, ValueCallback<String> cb) {}
}
