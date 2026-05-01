# 📱 بناء التطبيق كملف APK

تم تجهيز المشروع لـ **Capacitor + SQLite**. اتبع الخطوات التالية على جهازك (يحتاج Node.js و Android Studio):

## 1) تنزيل الكود وتثبيت الحزم
بعد سحب آخر نسخة من المشروع إلى جهازك:
```bash
npm install
```

## 2) بناء النسخة الثابتة (static export)
> ⚠️ ملاحظة مهمة: المشروع حالياً يبني على Cloudflare Workers (SSR). لتغليفه داخل APK نحتاج **مخرجات ثابتة** في مجلد `dist/`.
>
> أبسط طريقة: بناء عادي ثم نسخ مخرجات client فقط:
```bash
npm run build
# سيتم إنشاء مجلد dist تلقائيًا
```
إذا لم يظهر مجلد `dist`، فالمخرجات تكون في `.output/public` — انسخه:
```bash
cp -r .output/public dist
```

## 3) إضافة منصة Android (مرة واحدة فقط)
```bash
npx cap add android
npx cap sync android
```

## 4) فتح المشروع في Android Studio
```bash
npx cap open android
```
سيفتح Android Studio تلقائياً.

## 5) بناء ملف APK
داخل Android Studio:
- من القائمة: **Build → Build Bundle(s) / APK(s) → Build APK(s)**
- انتظر حتى ينتهي البناء.
- اضغط على **locate** في رسالة النجاح للوصول إلى الملف:
  `android/app/build/outputs/apk/debug/app-debug.apk`

## 6) تثبيت APK على هاتفك
- انقل الملف إلى هاتفك (USB أو Telegram أو Drive).
- افتحه على الهاتف ووافق على التثبيت من مصادر غير معروفة.

---

## 🔄 عند تحديث الكود لاحقاً
```bash
npm run build
cp -r .output/public dist     # إذا لزم
npx cap sync android
```
ثم أعد بناء APK من Android Studio.

---

## ✅ ما الذي تغيّر تقنياً؟
- **قاعدة البيانات**: عند تشغيل التطبيق على Android (APK) يستخدم **SQLite** تلقائياً عبر `@capacitor-community/sqlite`.
- **في المتصفح / PWA**: يبقى يستخدم **IndexedDB** كما السابق.
- **نفس واجهة الـ API** (`getAll`, `put`, `del`, `get`, `clear`) — لا تحتاج لتعديل أي صفحة.
- جميع البيانات تُخزن داخل الجهاز ويعمل التطبيق **بدون إنترنت**.

## 🆔 معرّف التطبيق
```
appId: app.brigade35.logbook
appName: اللواء 35 مشاة
```
يمكن تعديلها من ملف `capacitor.config.ts`.
