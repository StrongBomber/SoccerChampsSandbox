package android.content;
import android.net.Uri;
public class Intent {
    public static final String ACTION_CREATE_DOCUMENT = "android.intent.action.CREATE_DOCUMENT";
    public static final String ACTION_OPEN_DOCUMENT = "android.intent.action.OPEN_DOCUMENT";
    public static final String CATEGORY_OPENABLE = "android.intent.category.OPENABLE";
    public static final String EXTRA_TITLE = "android.intent.extra.TITLE";
    public static final String EXTRA_MIME_TYPES = "android.intent.extra.MIME_TYPES";
    public Intent() {}
    public Intent(String action) {}
    public Intent addCategory(String category) { return this; }
    public Intent setType(String type) { return this; }
    public Intent putExtra(String name, String value) { return this; }
    public Intent putExtra(String name, String[] value) { return this; }
    public Uri getData() { return null; }
}
