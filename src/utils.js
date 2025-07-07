export const isArabic = (text) => {
    if (!text) return false;
    const arabicRegex = /[\u0600-\u06FF]/;
    return arabicRegex.test(text);
};
