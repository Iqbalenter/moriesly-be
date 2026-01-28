/**
 * Menghitung Daily Sugar Limit berdasarkan profil user
 * WHO merekomendasikan maksimal 10% dari total kalori harian dari gula tambahan
 * 1 gram gula = 4 kalori
 * 
 * @param {object} profile - User profile object
 * @param {string} profile.gender - 'male' atau 'female'
 * @param {number} profile.age - Usia dalam tahun
 * @param {number} profile.weight - Berat badan dalam kg
 * @param {number} profile.height - Tinggi badan dalam cm
 * @param {string} profile.activityLevel - 'sedentary', 'light', 'moderate', 'active', 'very_active'
 * @returns {number} Daily sugar limit dalam gram
 */
export function calculateDailySugarLimit(profile) {
  // 1. Hitung BMR (Basal Metabolic Rate) menggunakan Mifflin-St Jeor Equation
  let bmr;
  
  if (profile.gender === 'male') {
    // BMR (Pria) = (10 × berat) + (6.25 × tinggi) - (5 × usia) + 5
    bmr = (10 * profile.weight) + (6.25 * profile.height) - (5 * profile.age) + 5;
  } else {
    // BMR (Wanita) = (10 × berat) + (6.25 × tinggi) - (5 × usia) - 161
    bmr = (10 * profile.weight) + (6.25 * profile.height) - (5 * profile.age) - 161;
  }

  // 2. Hitung TDEE (Total Daily Energy Expenditure) berdasarkan activity level
  const activityMultipliers = {
    'sedentary': 1.2,       // Little to no exercise
    'light': 1.375,         // Light exercise 1-3 days/week
    'moderate': 1.55,       // Moderate exercise 3-5 days/week
    'active': 1.725,        // Heavy exercise 6-7 days/week
    'very_active': 1.9      // Very heavy exercise, physical job
  };

  const activityLevel = profile.activityLevel || 'moderate';
  const tdee = bmr * activityMultipliers[activityLevel];

  // 3. Hitung 10% dari total kalori (rekomendasi WHO untuk gula tambahan)
  const sugarCalories = tdee * 0.10;

  // 4. Convert kalori ke gram (1 gram gula = 4 kalori)
  const sugarGrams = Math.round(sugarCalories / 4);

  // 5. Safety limits (tidak boleh terlalu rendah atau terlalu tinggi)
  const minLimit = 20; // Minimum 20 gram untuk kesehatan
  const maxLimit = 50; // Maximum 50 gram (WHO recommendation)

  return Math.min(Math.max(sugarGrams, minLimit), maxLimit);
}

/**
 * Parse LOG_ENTRY tag dari respons AI
 * Format: [[LOG_ENTRY|Item Name|SugarGrams|GlycemicIndex|Verdict|Type]]
 * 
 * @param {string} text - Text response dari AI
 * @returns {object|null} - Parsed log entry atau null jika tidak ada
 */
export function parseLogEntry(text) {
  const logPattern = /\[\[LOG_ENTRY\|([^|]+)\|(\d+)\|(\d+)\|([^|]+)\|(food|drink)\]\]/;
  const match = text.match(logPattern);

  if (!match) return null;

  return {
    name: match[1].trim(),
    sugarGrams: parseInt(match[2]),
    glycemicIndex: parseInt(match[3]),
    verdict: match[4].trim(),
    type: match[5]
  };
}

/**
 * Hitung teaspoon dari gram gula
 * 1 teaspoon = 4 grams
 */
export function gramsToTeaspoons(grams) {
  return (grams / 4).toFixed(1);
}
