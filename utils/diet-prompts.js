/**
 * Diet AI Prompts untuk Gemini API
 */

/**
 * Generate Daily Diet Plan Prompt
 */
export const GENERATE_DAILY_DIET_PROMPT = (userProfile, goalText) => `
Act as an elite tactical nutritionist AI. Generate a strict 1-day diet plan.

USER INTEL:
- Agent: ${userProfile.name}, ${userProfile.age}yo, ${userProfile.weight}kg, ${userProfile.height}cm.
- Gender: ${userProfile.gender}
- MISSION GOAL: "${goalText}"

REQUIREMENTS:
1. Analyze the goal to determine an icon (emoji) and a health score (0-100).
2. Create 3 distinct meals: Breakfast, Lunch, Dinner tailored to the user stats.
3. CRITICAL: Provide 'ingredients' as a simple ARRAY of strings for a shopping list.
4. Provide brief 'instructions' (max 2 sentences).
5. Calculate calories and sugar content accurately.

Return strictly JSON format:
{
  "target": "${goalText}",
  "icon": "emoji",
  "score": number (0-100),
  "summary": "Short motivating summary (max 15 words)",
  "meals": [
    {
      "type": "Breakfast",
      "menuName": "Meal name",
      "contents": "Short description",
      "ingredients": ["Ingredient 1", "Ingredient 2", "..."],
      "instructions": "How to prepare (max 2 sentences)",
      "prepTime": "Time in minutes (e.g., 10m)",
      "calories": number,
      "sugarGrams": number
    },
    {
      "type": "Lunch",
      "menuName": "...",
      "contents": "...",
      "ingredients": ["..."],
      "instructions": "...",
      "prepTime": "...",
      "calories": number,
      "sugarGrams": number
    },
    {
      "type": "Dinner",
      "menuName": "...",
      "contents": "...",
      "ingredients": ["..."],
      "instructions": "...",
      "prepTime": "...",
      "calories": number,
      "sugarGrams": number
    }
  ]
}

IMPORTANT: 
- Ensure all fields are filled
- Ingredients MUST be an array of strings
- Calories and sugar must be realistic numbers
- Score should reflect how healthy the plan is
`;

/**
 * Generate Weekly Diet Plan Prompt
 */
export const GENERATE_WEEKLY_DIET_PROMPT = (userProfile, goalText, daysArray) => `
Generate a tactical 7-day meal prep plan starting from TODAY.

USER: ${userProfile.name}, ${userProfile.age}yo, ${userProfile.weight}kg, ${userProfile.height}cm.
GENDER: ${userProfile.gender}
GOAL: "${goalText}"

IMPORTANT: Generate meals for the next 7 days starting from today:
${daysArray.map((d) => `Day ${d.dayIndex + 1}: ${d.dayName} (${d.dateStr})`).join('\n')}

Focus on efficiency and variety. Return strictly JSON:
{
  "weekName": "Operation Name (e.g., 'Tactical Nutrition Week 1')",
  "days": [
    {
      "day": "${daysArray[0]?.dayName || 'Monday'}",
      "totalCalories": number,
      "totalSugar": number,
      "meals": [
        {
          "type": "Breakfast",
          "menuName": "...",
          "contents": "...",
          "ingredients": ["Item 1", "Item 2"],
          "instructions": "...",
          "prepTime": "...",
          "calories": number,
          "sugarGrams": number
        },
        {
          "type": "Lunch",
          "menuName": "...",
          "contents": "...",
          "ingredients": ["..."],
          "instructions": "...",
          "prepTime": "...",
          "calories": number,
          "sugarGrams": number
        },
        {
          "type": "Dinner",
          "menuName": "...",
          "contents": "...",
          "ingredients": ["..."],
          "instructions": "...",
          "prepTime": "...",
          "calories": number,
          "sugarGrams": number
        }
      ]
    }
    ... (repeat for all 7 days)
  ]
}

IMPORTANT:
- Each day should have exactly 3 meals
- Calculate totalCalories and totalSugar for each day
- Vary the meals across days for diversity
- All ingredients must be in array format
`;

/**
 * Swap Meal Prompt
 */
export const SWAP_MEAL_PROMPT = (currentMeal, dietTarget) => `
The user wants to SWAP this meal: "${currentMeal.menuName}".
They dislike it or can't make it.

Generate a REPLACEMENT meal that:
1. Matches the meal type: ${currentMeal.type}.
2. Has similar calories: ~${currentMeal.calories}.
3. Fits the goal: ${dietTarget || "Healthy"}.
4. Is completely different from the original.

Return strictly JSON for a SINGLE MealItem object:
{
  "type": "${currentMeal.type}",
  "menuName": "New meal name",
  "contents": "Description",
  "ingredients": ["Ingredient 1", "Ingredient 2"],
  "instructions": "How to prepare",
  "prepTime": "Time",
  "calories": number,
  "sugarGrams": number
}

IMPORTANT: Make it interesting and different from "${currentMeal.menuName}"
`;

/**
 * Validate Food Image Prompt (untuk verify consumption)
 */
export const VALIDATE_FOOD_IMAGE_PROMPT = `
Analyze this image and determine if it contains actual food or a meal.

Return strictly JSON:
{
  "isFood": boolean,
  "confidence": number (0-100),
  "foodName": "Name of food if detected, or null",
  "reason": "Short explanation"
}

Examples:
- If it's a photo of spaghetti: {"isFood": true, "confidence": 95, "foodName": "Spaghetti", "reason": "Clear plate of pasta"}
- If it's a random object: {"isFood": false, "confidence": 90, "foodName": null, "reason": "No food detected"}
- If it's unclear: {"isFood": false, "confidence": 50, "foodName": null, "reason": "Image too blurry"}
`;

/**
 * Kategori diet yang tersedia
 */
export const DIET_CATEGORIES = {
  fat_loss: {
    id: "fat_loss",
    title: "Operation Shred",
    desc: "Aggressive fat loss via caloric deficit. High protein to spare muscle.",
    icon: "🔥",
  },
  muscle: {
    id: "muscle",
    title: "Iron Clad Bulk",
    desc: "Hypertrophy focus. Caloric surplus with strict macro ratios.",
    icon: "🥩",
  },
  maintenance: {
    id: "maintenance",
    title: "Vitality Ops",
    desc: "Performance maintenance. Balanced macros for sustained energy.",
    icon: "⚡",
  },
  keto: {
    id: "keto",
    title: "Ketogenic Stealth",
    desc: "Metabolic shift. High fat, ultra-low carb to eliminate glucose spikes.",
    icon: "🥑",
  },
};
