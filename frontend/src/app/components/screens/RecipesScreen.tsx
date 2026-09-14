import { useState } from "react";
import { useNavigate } from "react-router";
import { ChevronLeft, Heart, ChevronRight, Clock, Users } from "lucide-react";
import { useChildren } from "../../ChildContext";

// (Keeping your original static recipe data for the beautiful UI)
const recipes = [
  {
    id: 1,
    name: "Banana Oat Pancakes",
    image: "https://images.unsplash.com/photo-1611668317874-d0ae6dab6e12?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoZWFsdGh5JTIwYmFieSUyMGZvb2QlMjBib3lsJTIwbWVhbHxlbnwxfHx8fDE3NzgyNTIxOTB8MA&ixlib=rb-4.1.0&q=80&w=1080",
    cal: 180,
    time: "15 min",
    servings: 2,
    tags: ["#HighFiber", "#BabyFriendly"],
    saved: false,
    ingredients: ["2 ripe bananas", "½ cup rolled oats", "2 eggs", "Pinch of cinnamon", "Coconut oil"],
    steps: [
      "Mash bananas in a bowl until smooth.",
      "Add oats and eggs, mix well.",
      "Heat coconut oil in a pan over medium heat.",
      "Pour small amounts and cook 2 min each side.",
    ],
    nutrition: { protein: "6g", carbs: "28g", fat: "4g", fiber: "3g" },
  },
  {
    id: 2,
    name: "Avocado Toast Bites",
    image: "https://images.unsplash.com/photo-1561517146-dfbd99b0c14d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhdm9jYWRvJTIwdG9hc3QlMjBoZWFsdGh5JTIwYnJlYWtmYXN0fGVufDF8fHx8MTc3ODI0NzIwNnww&ixlib=rb-4.1.0&q=80&w=1080",
    cal: 160,
    time: "10 min",
    servings: 2,
    tags: ["#HealthyFat", "#IronRich"],
    saved: true,
    ingredients: ["1 ripe avocado", "2 slices whole grain bread", "Lemon juice", "Salt (minimal)", "Cherry tomatoes"],
    steps: [
      "Toast bread slices until golden.",
      "Mash avocado with lemon juice.",
      "Spread avocado on toast.",
      "Top with halved cherry tomatoes.",
    ],
    nutrition: { protein: "4g", carbs: "22g", fat: "9g", fiber: "5g" },
  },
  {
    id: 3,
    name: "Chicken Veggie Soup",
    image: "https://images.unsplash.com/photo-1641595573308-8964aa5d6a21?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjaGlja2VuJTIwdmVnZXRhYmxlJTIwc291cCUyMGtpZHN8ZW58MXx8fHwxNzc4MjUyMTk0fDA&ixlib=rb-4.1.0&q=80&w=1080",
    cal: 185,
    time: "30 min",
    servings: 4,
    tags: ["#HighProtein", "#IronRich"],
    saved: false,
    ingredients: ["200g chicken breast", "2 carrots", "1 potato", "1 celery stalk", "Low-sodium broth"],
    steps: [
      "Dice vegetables into small pieces.",
      "Cook chicken in broth for 15 min.",
      "Add vegetables and simmer 15 more min.",
      "Blend half for toddler-friendly texture.",
    ],
    nutrition: { protein: "18g", carbs: "14g", fat: "4g", fiber: "2g" },
  },
  {
    id: 4,
    name: "Fruit Smoothie Bowl",
    image: "https://images.unsplash.com/photo-1511909525232-61113c912358?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmcnVpdCUyMHNtb290aGllJTIwYm93bCUyMGNvbG9yZnVsfGVufDF8fHx8MTc3ODI1MjE5NHww&ixlib=rb-4.1.0&q=80&w=1080",
    cal: 140,
    time: "5 min",
    servings: 1,
    tags: ["#VitaminC", "#NaturalSugars"],
    saved: true,
    ingredients: ["1 banana", "½ cup mixed berries", "¼ cup yogurt", "Honey (1 tsp)", "Granola for topping"],
    steps: [
      "Blend banana, berries, and yogurt.",
      "Pour into bowl.",
      "Top with granola and fresh fruits.",
      "Drizzle with honey.",
    ],
    nutrition: { protein: "4g", carbs: "30g", fat: "2g", fiber: "4g" },
  },
];

const tagColors: Record<string, { bg: string; color: string }> = {
  "#HighProtein": { bg: "#E8F9F8", color: "#5CC8C2" },
  "#IronRich": { bg: "#FFF0E0", color: "#F47B20" },
  "#HighFiber": { bg: "#FFF8E0", color: "#FFC72C" },
  "#BabyFriendly": { bg: "#F0EDFF", color: "#9B8BF4" },
  "#HealthyFat": { bg: "#E8F9F8", color: "#5CC8C2" },
  "#VitaminC": { bg: "#FFE0EC", color: "#FF7BAC" },
  "#NaturalSugars": { bg: "#FFF8E0", color: "#FFC72C" },
};

export function RecipesScreen() {
  const navigate = useNavigate();
  const [savedRecipes, setSavedRecipes] = useState<number[]>([2, 4]);
  const [selectedRecipe, setSelectedRecipe] = useState<typeof recipes[0] | null>(null);
  const { activeChild } = useChildren();
  const childName = activeChild?.name ?? "your toddler";


  if (selectedRecipe) {
    return (
      <div className="flex flex-col h-full overflow-y-auto" style={{ background: "#FFF8EF" }}>
        {/* Hero image */}
        <div className="relative flex-shrink-0" style={{ height: 220 }}>
          <img src={selectedRecipe.image} alt={selectedRecipe.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 40%, #FFF8EF 100%)" }} />
          <button
            onClick={() => setSelectedRecipe(null)}
            className="absolute top-3 left-3 rounded-full flex items-center justify-center"
            style={{ width: 38, height: 38, background: "rgba(255,255,255,0.9)", boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}
          >
            <ChevronLeft size={20} style={{ color: "#2D3047" }} />
          </button>
          <button
            onClick={() => setSavedRecipes(s => s.includes(selectedRecipe.id) ? s.filter(i => i !== selectedRecipe.id) : [...s, selectedRecipe.id])}
            className="absolute top-3 right-3 rounded-full flex items-center justify-center"
            style={{ width: 38, height: 38, background: "rgba(255,255,255,0.9)", boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}
          >
            <Heart size={18} style={{ color: savedRecipes.includes(selectedRecipe.id) ? "#F47B20" : "#9BA3B8" }} fill={savedRecipes.includes(selectedRecipe.id) ? "#F47B20" : "none"} />
          </button>
        </div>

        <div className="px-4 pt-2 flex flex-col gap-4 pb-6">
          <div>
            <h2 style={{ fontSize: "22px", fontWeight: 900, color: "#2D3047", fontFamily: "'Nunito', sans-serif" }}>{selectedRecipe.name}</h2>
            <div className="flex items-center gap-4 mt-1">
              <div className="flex items-center gap-1">
                <Clock size={14} style={{ color: "#9BA3B8" }} />
                <span style={{ fontSize: "12px", color: "#717182", fontFamily: "'Nunito', sans-serif", fontWeight: 700 }}>{selectedRecipe.time}</span>
              </div>
              <div className="flex items-center gap-1">
                <Users size={14} style={{ color: "#9BA3B8" }} />
                <span style={{ fontSize: "12px", color: "#717182", fontFamily: "'Nunito', sans-serif", fontWeight: 700 }}>{selectedRecipe.servings} servings</span>
              </div>
              <span className="px-2 py-0.5 rounded-full" style={{ background: "#FFF0E0", fontSize: "11px", fontWeight: 800, color: "#F47B20", fontFamily: "'Nunito', sans-serif" }}>
                {selectedRecipe.cal} kcal
              </span>
            </div>
            <div className="flex gap-2 mt-2 flex-wrap">
              {selectedRecipe.tags.map(tag => {
                const style = tagColors[tag] || { bg: "#F5F5F5", color: "#9BA3B8" };
                return (
                  <span key={tag} className="px-2 py-0.5 rounded-full" style={{ background: style.bg, fontSize: "10px", fontWeight: 800, color: style.color, fontFamily: "'Nunito', sans-serif" }}>{tag}</span>
                );
              })}
            </div>
          </div>

          {/* Nutrition table */}
          <div className="rounded-2xl p-4" style={{ background: "white", boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}>
            <p style={{ fontSize: "13px", fontWeight: 900, color: "#2D3047", fontFamily: "'Nunito', sans-serif", marginBottom: 8 }}>📊 Nutrition Info</p>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(selectedRecipe.nutrition).map(([key, val]) => (
                <div key={key} className="text-center rounded-xl p-2" style={{ background: "#F8F9FD" }}>
                  <p style={{ fontSize: "14px", fontWeight: 900, color: "#F47B20", fontFamily: "'Nunito', sans-serif" }}>{val}</p>
                  <p style={{ fontSize: "9px", color: "#9BA3B8", fontFamily: "'Nunito', sans-serif", fontWeight: 700, textTransform: "capitalize" }}>{key}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Ingredients */}
          <div>
            <p style={{ fontSize: "14px", fontWeight: 900, color: "#2D3047", fontFamily: "'Nunito', sans-serif", marginBottom: 8 }}>🥕 Ingredients</p>
            <div className="flex flex-col gap-2">
              {selectedRecipe.ingredients.map((ing, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-2.5 rounded-2xl" style={{ background: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
                  <div className="rounded-full flex-shrink-0" style={{ width: 8, height: 8, background: "#5CC8C2" }} />
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "#2D3047", fontFamily: "'Nunito', sans-serif" }}>{ing}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Steps */}
          <div>
            <p style={{ fontSize: "14px", fontWeight: 900, color: "#2D3047", fontFamily: "'Nunito', sans-serif", marginBottom: 8 }}>👨‍🍳 Instructions</p>
            <div className="flex flex-col gap-3">
              {selectedRecipe.steps.map((step, i) => (
                <div key={i} className="flex gap-3">
                  <div className="rounded-full flex-shrink-0 flex items-center justify-center" style={{ width: 26, height: 26, background: "linear-gradient(135deg, #F47B20, #FFC72C)", marginTop: 1 }}>
                    <span style={{ fontSize: "11px", fontWeight: 900, color: "white", fontFamily: "'Nunito', sans-serif" }}>{i + 1}</span>
                  </div>
                  <p style={{ fontSize: "13px", fontWeight: 600, color: "#2D3047", fontFamily: "'Nunito', sans-serif", lineHeight: 1.5 }}>{step}</p>
                </div>
              ))}
            </div>
          </div>

          <button
            className="w-full py-4 rounded-full transition-transform active:scale-95"
            style={{ background: "linear-gradient(90deg, #F47B20, #FFC72C)", color: "white", fontSize: "15px", fontWeight: 800, fontFamily: "'Nunito', sans-serif", boxShadow: "0 4px 16px rgba(244,123,32,0.35)" }}
          >
            Add to Today's Diary 📖
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen pb-6" style={{ background: "#FFF8EF" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-4">
        <button onClick={() => navigate("/home")}>
          <ChevronLeft size={24} style={{ color: "#2D3047" }} />
        </button>
        <div className="flex-1">
          <h1 style={{ fontSize: "20px", fontWeight: 900, color: "#2D3047", fontFamily: "'Nunito', sans-serif" }}>
            👨‍🍳 Recipes
          </h1>
          <p style={{ fontSize: "12px", color: "#9BA3B8", fontFamily: "'Nunito', sans-serif", fontWeight: 600 }}>
            Toddler-approved meals
          </p>
        </div>
      </div>

      <div className="px-4 flex flex-col gap-4 pb-6">
        {/* Chef SIMBA header */}
        <div className="rounded-3xl p-4" style={{ background: "linear-gradient(135deg, #5CC8C2, #3AA8A2)", boxShadow: "0 6px 20px rgba(92,200,194,0.3)" }}>
          <div className="flex items-center gap-3">
            <span style={{ fontSize: "36px" }}>👨‍🍳</span>
            <div>
              <p style={{ fontSize: "16px", fontWeight: 900, color: "white", fontFamily: "'Nunito', sans-serif" }}>Recipe Recommendations</p>
              <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.8)", fontFamily: "'Nunito', sans-serif", fontWeight: 600 }}>
                Curated for {childName}'s age & nutrition
              </p>
            </div>
          </div>
        </div>

        {/* Recipe list */}
        {recipes.map((recipe) => (
          <button
            key={recipe.id}
            onClick={() => setSelectedRecipe(recipe)}
            className="rounded-3xl overflow-hidden text-left transition-transform active:scale-95"
            style={{ background: "white", boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}
          >
            <div className="relative" style={{ height: 160 }}>
              <img src={recipe.image} alt={recipe.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 30%, rgba(45,48,71,0.7) 100%)" }} />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSavedRecipes(s => s.includes(recipe.id) ? s.filter(i => i !== recipe.id) : [...s, recipe.id]);
                }}
                className="absolute top-3 right-3 rounded-full flex items-center justify-center"
                style={{ width: 34, height: 34, background: "rgba(255,255,255,0.9)" }}
              >
                <Heart size={16} style={{ color: savedRecipes.includes(recipe.id) ? "#F47B20" : "#9BA3B8" }} fill={savedRecipes.includes(recipe.id) ? "#F47B20" : "none"} />
              </button>
              <div className="absolute bottom-3 left-3 right-3">
                <div className="flex gap-1 flex-wrap mb-1">
                  {recipe.tags.map(tag => {
                    const style = tagColors[tag] || { bg: "rgba(255,255,255,0.9)", color: "#2D3047" };
                    return (
                      <span key={tag} className="px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.9)", fontSize: "9px", fontWeight: 800, color: style.color, fontFamily: "'Nunito', sans-serif" }}>{tag}</span>
                    );
                  })}
                </div>
                <p style={{ fontSize: "15px", fontWeight: 900, color: "white", fontFamily: "'Nunito', sans-serif" }}>{recipe.name}</p>
              </div>
            </div>
            <div className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <Clock size={13} style={{ color: "#9BA3B8" }} />
                  <span style={{ fontSize: "11px", color: "#717182", fontFamily: "'Nunito', sans-serif", fontWeight: 700 }}>{recipe.time}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users size={13} style={{ color: "#9BA3B8" }} />
                  <span style={{ fontSize: "11px", color: "#717182", fontFamily: "'Nunito', sans-serif", fontWeight: 700 }}>{recipe.servings}</span>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full" style={{ background: "#FFF0E0", fontSize: "11px", fontWeight: 800, color: "#F47B20", fontFamily: "'Nunito', sans-serif" }}>
                {recipe.cal} kcal
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}