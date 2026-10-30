package android.app;
import android.content.ContentResolver;
import android.content.Intent;
import android.content.res.AssetManager;
import android.os.Bundle;
import android.view.View;
public class Activity {
    public static final int RESULT_OK = -1;
    protected void onCreate(Bundle savedInstanceState) {}
    protected void onDestroy() {}
    public void onBackPressed() {}
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {}
    public void setContentView(View view) {}
    public AssetManager getAssets() { return null; }
    public ContentResolver getContentResolver() { return null; }
    public void startActivityForResult(Intent intent, int requestCode) {}
    public void runOnUiThread(Runnable action) {}
}
