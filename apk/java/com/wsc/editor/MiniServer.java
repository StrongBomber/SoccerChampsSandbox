package com.wsc.editor;

import android.content.res.AssetManager;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetAddress;
import java.net.ServerSocket;
import java.net.Socket;

/**
 * APK içindeki assets/ klasörünü 127.0.0.1 üzerinde servis eden küçük HTTP sunucusu.
 *
 * Neden: WebView'de file:// origin'i fetch() ve localStorage'ı kısıtlar.
 * Yerel bir HTTP origin'i ile editör normal bir web uygulaması gibi çalışır.
 */
final class MiniServer {

    private final AssetManager assets;
    private ServerSocket socket;
    private Thread acceptThread;
    private volatile boolean running;

    MiniServer(AssetManager assets) {
        this.assets = assets;
    }

    void start() throws IOException {
        socket = new ServerSocket(0, 8, InetAddress.getByName("127.0.0.1"));
        running = true;
        acceptThread = new Thread(new Runnable() {
            @Override public void run() {
                while (running) {
                    try {
                        final Socket client = socket.accept();
                        Thread t = new Thread(new Runnable() {
                            @Override public void run() { handle(client); }
                        });
                        t.setDaemon(true);
                        t.start();
                    } catch (IOException e) {
                        if (running) continue;
                    }
                }
            }
        });
        acceptThread.setDaemon(true);
        acceptThread.start();
    }

    int getPort() {
        return socket == null ? 0 : socket.getLocalPort();
    }

    void stop() {
        running = false;
        try { if (socket != null) socket.close(); } catch (IOException ignored) { }
    }

    private void handle(Socket client) {
        try {
            client.setSoTimeout(5000);
            InputStream in = client.getInputStream();
            String requestLine = readLine(in);
            if (requestLine == null) { client.close(); return; }

            String path = "/";
            String[] parts = requestLine.split(" ");
            if (parts.length >= 2) path = parts[1];
            int q = path.indexOf('?');
            if (q >= 0) path = path.substring(0, q);
            if (path.equals("/") || path.isEmpty()) path = "/index.html";
            if (path.startsWith("/")) path = path.substring(1);
            if (path.contains("..")) { respond(client, 400, "text/plain", "bad request".getBytes("UTF-8")); return; }

            byte[] body;
            try {
                body = readAsset(path);
            } catch (IOException e) {
                respond(client, 404, "text/plain; charset=utf-8", ("bulunamadı: " + path).getBytes("UTF-8"));
                client.close();
                return;
            }
            respond(client, 200, contentType(path), body);
        } catch (Exception ignored) {
            // istemci kapatıldı
        } finally {
            try { client.close(); } catch (IOException ignored) { }
        }
    }

    private byte[] readAsset(String path) throws IOException {
        InputStream in = assets.open(path);
        try {
            ByteArrayOutputStream out = new ByteArrayOutputStream(Math.max(1024, in.available()));
            byte[] buf = new byte[16384];
            int n;
            while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
            return out.toByteArray();
        } finally {
            in.close();
        }
    }

    private static String contentType(String path) {
        String p = path.toLowerCase();
        if (p.endsWith(".html")) return "text/html; charset=utf-8";
        if (p.endsWith(".js")) return "application/javascript; charset=utf-8";
        if (p.endsWith(".css")) return "text/css; charset=utf-8";
        if (p.endsWith(".json")) return "application/json; charset=utf-8";
        if (p.endsWith(".svg")) return "image/svg+xml";
        if (p.endsWith(".png")) return "image/png";
        if (p.endsWith(".jpg") || p.endsWith(".jpeg")) return "image/jpeg";
        if (p.endsWith(".woff2")) return "font/woff2";
        return "application/octet-stream";
    }

    private static void respond(Socket client, int code, String type, byte[] body) throws IOException {
        OutputStream out = client.getOutputStream();
        String head = "HTTP/1.1 " + code + (code == 200 ? " OK" : " Error") + "\r\n"
                + "Content-Type: " + type + "\r\n"
                + "Content-Length: " + body.length + "\r\n"
                + "Cache-Control: no-store\r\n"
                + "Connection: close\r\n\r\n";
        out.write(head.getBytes("UTF-8"));
        out.write(body);
        out.flush();
    }

    private static String readLine(InputStream in) throws IOException {
        StringBuilder sb = new StringBuilder();
        int c;
        while ((c = in.read()) != -1) {
            if (c == '\n') break;
            if (c != '\r') sb.append((char) c);
            if (sb.length() > 8192) break;
        }
        return sb.length() == 0 ? null : sb.toString();
    }
}
