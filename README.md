# Veo Studio — Vercel One Project

هذا المشروع يجمع الواجهة والـBackend في مشروع Next.js واحد، ويمكن نشره بالكامل على Vercel.

## 1) التثبيت المحلي

```bash
npm install
```

## 2) مفتاح Gemini

أنشئ ملف `.env.local`:

```env
GEMINI_API_KEY=ضع_مفتاحك_هنا
```

لا تضع المفتاح داخل `NEXT_PUBLIC_*` ولا داخل ملفات الواجهة.

## 3) التشغيل

```bash
npm run dev
```

ثم افتح:
http://localhost:3000

## 4) النشر على Vercel

ارفع المشروع إلى GitHub، ثم اربطه بـ Vercel.

في Vercel:
Project → Settings → Environment Variables

أضف:
- Name: `GEMINI_API_KEY`
- Value: مفتاح Gemini
- Environment: Production (ويمكن Preview/Development)

ثم أعد Deploy.

الـAPI routes موجودة داخل:
- `/api/generate`
- `/api/status`
- `/api/video`

المفتاح لا يصل إلى المتصفح.

## ملاحظات

- النسخة الحالية تستخدم Veo 3.1 Fast.
- الفيديو الناتج يتم تمريره للمستخدم عبر `/api/video` حتى لا يظهر مفتاح Gemini في المتصفح.
- صورة الإدخال محدودة في الواجهة إلى 3MB لتجنب أحجام الطلبات الكبيرة.
- نظام المستخدمين، الرصيد، قاعدة البيانات، سجل الفيديوهات، والدفع يمكن إضافتهم في المرحلة التالية.
