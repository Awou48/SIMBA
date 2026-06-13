import { useState } from "react";
import { useNavigate } from "react-router";
import logo1 from "../../../imports/logo_1.png"; 

const slides = [
  {
    image: "https://images.unsplash.com/photo-1592783074241-ec3763189417?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwYXJlbnQlMjB0b2RkbGVyJTIwY2hpbGQlMjBncm93dGglMjBoZWFsdGh5fGVufDF8fHx8MTc3ODI1MjE4OXww&ixlib=rb-4.1.0&q=80&w=1080",
    title: "Track Every Milestone",
    subtitle: "Monitor your little one's growth journey with beautiful charts and WHO percentile insights.",
    accent: "#F47B20",
  },
  {
    image: "https://images.unsplash.com/photo-1610415946201-295954703dd9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb2xvcmZ1bCUyMHRvZGRsZXIlMjBmb29kJTIwZnJ1aXRzJTIwdmVnZXRhYmxlc3xlbnwxfHx8fDE3NzgyNTIxODl8MA&ixlib=rb-4.1.0&q=80&w=1080",
    title: "Nutritious Meal Ideas",
    subtitle: "Discover age-appropriate recipes tailored to your toddler's nutritional needs and taste buds.",
    accent: "#5CC8C2",
  },
  {
    image: "https://images.unsplash.com/photo-1655555082352-82e09b770bda?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoYXBweSUyMGNoaWxkJTIwY2FsZW5kYXIlMjBoZWFsdGh8ZW58MXx8fHwxNzc4MjUyMTg5fDA&ixlib=rb-4.1.0&q=80&w=1080",
    title: "Never Miss a Vaccine",
    subtitle: "Stay on top of your child's immunization schedule with timely reminders and health records.",
    accent: "#FFC72C",
  },
];

export function OnboardingScreen() {
  const [current, setCurrent] = useState(0);
  const navigate = useNavigate();
  const isLast = current === slides.length - 1;

  const handleNext = () => {
    if (isLast) navigate("/login");
    else setCurrent(current + 1);
  };

  const slide = slides[current];

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ background: "#FFF8EF" }}>
      {/* Image */}
      <div className="relative flex-shrink-0" style={{ height: "420px" }}>
        <img src={slide.image} alt={slide.title} className="w-full h-full object-cover" />
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(to bottom, transparent 40%, #FFF8EF 100%)",
          }}
        />
        {/* Skip */}
        <button
          onClick={() => navigate("/login")}
          className="absolute top-4 right-4 px-4 py-2 rounded-full"
          style={{ background: "rgba(255,255,255,0.9)", fontSize: "12px", fontWeight: 700, color: "#9BA3B8", fontFamily: "'Nunito', sans-serif" }}
        >
          Skip
        </button>
        {/* Logo badge */}
        <div className="absolute top-4 left-4 rounded-2xl overflow-hidden" style={{ width: 40, height: 40, background: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}>
          <img src={logo1} alt="SIMBA" className="w-full h-full object-contain p-1" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center px-6 pt-2 pb-6" style={{ gap: "16px" }}>
        {/* Dots */}
        <div className="flex gap-2">
          {slides.map((_, i) => (
            <div
              key={i}
              className="rounded-full transition-all"
              style={{
                width: i === current ? 24 : 8,
                height: 8,
                background: i === current ? slide.accent : "#E0E0E0",
              }}
            />
          ))}
        </div>

        <div className="text-center flex flex-col gap-2">
          <h2
            style={{
              fontSize: "26px",
              fontWeight: 900,
              color: "#2D3047",
              fontFamily: "'Nunito', sans-serif",
              lineHeight: 1.2,
            }}
          >
            {slide.title}
          </h2>
          <p
            style={{
              fontSize: "14px",
              fontWeight: 600,
              color: "#717182",
              fontFamily: "'Nunito', sans-serif",
              lineHeight: 1.6,
            }}
          >
            {slide.subtitle}
          </p>
        </div>

        <div className="flex flex-col gap-3 w-full mt-auto">
          <button
            onClick={handleNext}
            className="w-full py-4 rounded-full transition-transform active:scale-95"
            style={{
              background: `linear-gradient(90deg, #F47B20, #FFC72C)`,
              color: "white",
              fontSize: "16px",
              fontWeight: 800,
              fontFamily: "'Nunito', sans-serif",
              boxShadow: "0 4px 16px rgba(244, 123, 32, 0.35)",
            }}
          >
            {isLast ? "Get Started 🦁" : "Next →"}
          </button>

          <button
            onClick={() => navigate("/login")}
            style={{
              fontSize: "13px",
              fontWeight: 700,
              color: "#9BA3B8",
              fontFamily: "'Nunito', sans-serif",
            }}
          >
            Already have an account? <span style={{ color: "#F47B20" }}>Log in</span>
          </button>
        </div>
      </div>
    </div>
  );
}