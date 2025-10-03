// بيانات الحروف: العبري + الاسم العربي + التقريب + IPA + ملاحظة أولية
// الملاحظات والـ IPA تقريبية تعليمية، وليست معيارًا لهجيًا صارمًا.
const LETTERS = [
  {he:"א", nameAr:"ألف", approxAr:"ء/أ", ipa:"ʔ / ∅", tips:"حامل حركة أو همزة خفيفة."},
  {he:"בּ", nameAr:"بيت (منقوط)", approxAr:"ب", ipa:"b", tips:"بـ صافية."},
  {he:"ב", nameAr:"بيت", approxAr:"ڤ/ف", ipa:"v", tips:"في العبرية الحديثة أقرب لـ v."},
  {he:"ג", nameAr:"جِمِل", approxAr:"ج/گ", ipa:"ɡ ~ ɣ", tips:"أحيانًا أقرب لـ گ."},
  {he:"ד", nameAr:"دالت", approxAr:"د", ipa:"d", tips:"دال."},
  {he:"ה", nameAr:"هي", approxAr:"هـ", ipa:"h", tips:"قد تُسكن في نهاية الكلمة."},
  {he:"ו", nameAr:"ڤاف", approxAr:"و/ڤ", ipa:"v / u / o / w", tips:"حرف علة أو v."},
  {he:"ז", nameAr:"زاين", approxAr:"ز", ipa:"z", tips:"زاي."},
  {he:"ח", nameAr:"حيت", approxAr:"ح/خ", ipa:"χ ~ ħ", tips:"بين خ وح."},
  {he:"ט", nameAr:"طِت", approxAr:"ط", ipa:"tˤ ~ t", tips:"أقرب لت مفخمة تاريخيًا."},
  {he:"י", nameAr:"يود", approxAr:"ي", ipa:"j / i", tips:"ي أو صوت علة i."},
  {he:"כּ", nameAr:"كاف (منقوط)", approxAr:"ك", ipa:"k", tips:"كاف."},
  {he:"כ", nameAr:"كاف", approxAr:"خ", ipa:"χ", tips:"بدون نقطة ≈ خ."},
  {he:"ך", nameAr:"كاف نهائي", approxAr:"خ", ipa:"χ", tips:"شكل نهائي."},
  {he:"ל", nameAr:"لامد", approxAr:"ل", ipa:"l", tips:"لام."},
  {he:"מ", nameAr:"ميم", approxAr:"م", ipa:"m", tips:"ميم. نهايتها ם."},
  {he:"ם", nameAr:"ميم نهائي", approxAr:"م", ipa:"m", tips:"شكل نهائي."},
  {he:"נ", nameAr:"نون", approxAr:"ن", ipa:"n", tips:"نون. نهايتها ן."},
  {he:"ן", nameAr:"نون نهائي", approxAr:"ن", ipa:"n", tips:"شكل نهائي."},
  {he:"ס", nameAr:"ساميخ", approxAr:"س", ipa:"s", tips:"سين."},
  {he:"ע", nameAr:"عين", approxAr:"ع/ء", ipa:"ʕ / ʔ / ∅", tips:"تُخفّف في الحديثة."},
  {he:"פּ", nameAr:"پي (منقوط)", approxAr:"پ", ipa:"p", tips:"پ."},
  {he:"פ", nameAr:"پي", approxAr:"ف", ipa:"f", tips:"ف. نهائي ף."},
  {he:"ף", nameAr:"پي نهائي", approxAr:"ف", ipa:"f", tips:"شكل نهائي."},
  {he:"צ", nameAr:"صدي", approxAr:"ص/تس", ipa:"tsˁ ~ ts", tips:"بين ص وتس. نهائي ץ."},
  {he:"ץ", nameAr:"صدي نهائي", approxAr:"ص/تس", ipa:"ts", tips:"شكل نهائي."},
  {he:"ק", nameAr:"قوف", approxAr:"ق/ك", ipa:"k", tips:"غالبًا ك مفخّمة قديمًا."},
  {he:"ר", nameAr:"ريش", approxAr:"ر/غ", ipa:"ʁ ~ r ~ ɾ", tips:"ر حنجرية أو لثوية."},
  {he:"שׁ", nameAr:"شين", approxAr:"ش", ipa:"ʃ", tips:"نقطة يمين = ش."},
  {he:"שׂ", nameAr:"سين (شين يسار)", approxAr:"س", ipa:"s", tips:"نقطة يسار = س."},
  {he:"ת", nameAr:"تاڤ", approxAr:"ت", ipa:"t", tips:"تاء."}
];

// الحركات (نِقُوط) (تعليمي)
const NIQQUD = [
  {mark:"\u05B8", name:"قامَتس", approx:"ا/آ"},
  {mark:"\u05B6", name:"سِغول", approx:"e / ِ"},
  {mark:"\u05B4", name:"حِريك", approx:"i / ِ"},
  {mark:"\u05B9", name:"حولام", approx:"o / ُ"},
  {mark:"\u05BC", name:"دَجِش", approx:"تشديد/نقطة للحرف"},
  {mark:"\u05B0", name:"شڤا", approx:"سكون/حركة خفيفة"}
];

// مقاطع قراءة بسيطة
const SYLLABLES = ["בַ","דִ","מֶ","שׁו","כָּ","לֶ","רִ","נָ","סו","אִ","פּו","צֵ","תַּ","יו","חו"];
