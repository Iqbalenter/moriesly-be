// utils/training-prompts.js

export const GENERATE_DAILY_TRAINING_PROMPT = (
  userProfile,
  mode,
  constraints
) => {
  return `
Act as a Tactical Performance Coach with expertise in personalized fitness programming.

USER PROFILE:
- Age: ${userProfile.age} years old
- Weight: ${userProfile.weight} kg
- Gender: ${userProfile.gender}
- Activity Level: ${userProfile.activityLevel || "moderate"}
${userProfile.medicalConditions && userProfile.medicalConditions.length > 0 ? `- Medical Conditions: ${userProfile.medicalConditions.join(", ")}` : ""}

TRAINING OBJECTIVE:
${mode === "burn" ? "Fat Loss & Calorie Burning" : "Muscle Building & Strength Gain"}

USER CONSTRAINTS & PREFERENCES:
${constraints}

TASK:
Generate a comprehensive Full Day Operation Schedule covering 4 phases: Morning, Afternoon, Evening, and Night.

CRITICAL RULES:
1. **Age-Appropriate Scaling**: Adjust workout intensity based on age. Younger users (18-30) can handle higher intensity, older users (50+) need lower impact exercises.
2. **Respect Focus Area**: 
   - "Full Body" → Mix of upper, lower, and core exercises
   - "Upper" → Focus on chest, back, shoulders, arms
   - "Lower" → Focus on legs, glutes, calves
   - "Core" → Focus on abs, obliques, lower back
   - "Cardio" → Running, cycling, HIIT, jumping exercises
   - Custom text → Interpret user's specific request (e.g., "Glutes only", "Shoulder rehab")
3. **Equipment Restrictions**: STRICTLY use only the available equipment mentioned in constraints:
   - "Bodyweight" → No equipment, use body only
   - "Dumbbells" → Dumbbell exercises only
   - "Gym" → Full gym equipment (barbell, machines, cables, etc.)
   - "Home Items" → Chair, stairs, water bottles, resistance bands
4. **Medical Safety**: If medical conditions mentioned, avoid contraindicated exercises.
5. **Time Format**: Use 12-hour format (e.g., "07:00 AM", "02:30 PM") NOT military time.
6. **Action Names**: Use SHORT action verbs (1-2 words) like:
   - Running, Jogging, Sprints (for cardio visualization)
   - Squats, Lunges, Deadlift (for lower body)
   - Pushups, Pullups, Bench Press (for upper body)
   - Plank, Crunches, Leg Raises (for core)
   - Yoga, Stretching (for recovery)
7. **Sugar Impact**: Negative numbers represent calorie burn. Calculate realistic values:
   - Light activity (yoga, stretching): -30 to -50
   - Moderate (walking, light weights): -80 to -120
   - Intense (HIIT, heavy lifting): -150 to -250
8. **Meal Planning**: Provide balanced meals that support the training objective:
   - Fat Loss: Higher protein, moderate carbs, controlled portions
   - Muscle Build: Higher protein, adequate carbs for recovery, larger portions

OUTPUT STRUCTURE:
Return ONLY valid JSON (no markdown, no code blocks) with this exact structure:

{
  "codename": "Creative operation name (e.g., 'Operation Iron Resolve', 'Mission Phoenix Protocol')",
  "totalCaloriesBurn": <number: sum of all negative sugarImpact values>,
  "schedule": [
    {
      "phase": "Morning",
      "timeLabel": "07:00 AM",
      "actionName": "Morning Run",
      "actionDetail": "30 minutes moderate pace, 5 km target distance. Focus on consistent breathing.",
      "fuelName": "Protein Power Oatmeal",
      "fuelDetail": "Rolled oats 50g, banana 1 medium, whey protein powder 30g, almond milk 200ml, chia seeds 10g, honey 5g",
      "sugarImpact": -120
    },
    {
      "phase": "Afternoon",
      "timeLabel": "12:00 PM",
      "actionName": "Heavy Squats",
      "actionDetail": "4 sets × 12 reps, bodyweight or weighted. Rest 90 seconds between sets. Focus on depth and form.",
      "fuelName": "Grilled Chicken Power Bowl",
      "fuelDetail": "Grilled chicken breast 150g, quinoa 80g, mixed greens 100g, cherry tomatoes 50g, olive oil dressing 15ml, avocado 30g",
      "sugarImpact": -85
    },
    {
      "phase": "Evening",
      "timeLabel": "06:00 PM",
      "actionName": "Pushup Circuit",
      "actionDetail": "5 sets × 15 reps. Variations: standard, wide grip, diamond. Rest 60 seconds between sets.",
      "fuelName": "Baked Salmon Feast",
      "fuelDetail": "Salmon fillet 120g, brown rice 80g, steamed broccoli 100g, lemon butter sauce 10g",
      "sugarImpact": -95
    },
    {
      "phase": "Night",
      "timeLabel": "08:30 PM",
      "actionName": "Yoga Flow",
      "actionDetail": "20 minutes gentle stretching. Focus on hip openers, hamstrings, and deep breathing for recovery.",
      "fuelName": "Greek Yogurt Recovery Bowl",
      "fuelDetail": "Greek yogurt 150g, mixed berries 50g, chia seeds 10g, almonds 15g, honey drizzle 5g",
      "sugarImpact": -40
    }
  ]
}

IMPORTANT REMINDERS:
- Return ONLY the JSON object, no additional text
- Ensure all sugarImpact values are NEGATIVE (representing calorie burn)
- Make actionName SHORT (1-3 words maximum) for UI visualization
- Scale difficulty based on user's age and stated intensity level
- Be creative with operation codenames (military/tactical theme)
- Ensure meals are realistic, culturally appropriate, and achievable
`;
};

export const TRAINING_RATE_LIMIT_MESSAGE = (nextAvailable) => {
  return `Mission Control Offline: Daily training plan already generated. Next generation available at ${nextAvailable}. Current plan remains active.`;
};
