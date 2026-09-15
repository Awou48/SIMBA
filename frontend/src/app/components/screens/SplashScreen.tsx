import { useEffect } from "react";
import { useNavigate } from "react-router";
import logo1 from "../../../imports/logo_1.png";
import { session } from "../../../lib/api";

export function SplashScreen() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (session.isLoggedInAs("Health Manager")) {
        navigate("/hm/dashboard", { replace: true });
      } else if (session.isLoggedInAs("Parent")) {
        navigate("/home", { replace: true });
      } else {
        navigate("/onboarding");
      }
    }, 2800);
    
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div
      className="relative h-full flex flex-col items-center justify-center overflow-hidden"
      style={{
        background: "linear-gradient(160deg, #FFF8EF 0%, #FFE8C8 50%, #FFF0D6 100%)",
      }}
    >
      <div
        className="absolute top-[-60px] right-[-60px] rounded-full opacity-20"
        style={{ width: 200, height: 200, background: "#F47B20" }}
      />
      <div
        className="absolute bottom-[100px] left-[-40px] rounded-full opacity-15"
        style={{ width: 150, height: 150, background: "#FFC72C" }}
      />
      <div
        className="absolute top-[40%] right-[-30px] rounded-full opacity-10"
        style={{ width: 100, height: 100, background: "#5CC8C2" }}
      />

      {[
        { top: "15%", left: "12%", size: 18, rotation: -15 },
        { top: "25%", right: "10%", size: 14, rotation: 20 },
        { bottom: "30%", left: "8%", size: 16, rotation: 10 },
        { bottom: "20%", right: "14%", size: 20, rotation: -10 },
        { top: "60%", left: "18%", size: 12, rotation: 30 },
      ].map((pos, i) => (
        <div
          key={i}
          className="absolute opacity-30"
          style={{ ...pos, transform: `rotate(${pos.rotation}deg)` }}
        >
          <svg width={pos.size} height={pos.size} viewBox="0 0 24 24" fill="#F47B20">
            <path d="M12 17c-2.5 0-5-2-5-5s2.5-4 5-4 5 1.5 5 4-2.5 5-5 5zm-6-9c-.8 0-1.5-.7-1.5-1.5S5.2 5 6 5s1.5.7 1.5 1.5S6.8 8 6 8zm4-2c-.8 0-1.5-.7-1.5-1.5S9.2 3 10 3s1.5.7 1.5 1.5S10.8 6 10 6zm4 0c-.8 0-1.5-.7-1.5-1.5S13.2 3 14 3s1.5.7 1.5 1.5S14.8 6 14 6zm4 2c-.8 0-1.5-.7-1.5-1.5S17.2 5 18 5s1.5.7 1.5 1.5S18.8 8 18 8z"/>
          </svg>
        </div>
      ))}

      {[
        { top: "10%", left: "30%", size: 16 },
        { top: "18%", right: "25%", size: 12 },
        { bottom: "35%", right: "20%", size: 14 },
        { bottom: "25%", left: "25%", size: 10 },
      ].map((pos, i) => (
        <div key={i} className="absolute opacity-40" style={pos}>
          <svg width={pos.size} height={pos.size} viewBox="0 0 24 24" fill="#FFC72C">
            <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17 5.8 21.3l2.4-7.4L2 9.4h7.6z"/>
          </svg>
        </div>
      ))}

      <div className="relative z-10 flex flex-col items-center gap-6">
        <div
          className="rounded-3xl flex items-center justify-center p-4"
          style={{
            background: "white",
            boxShadow: "0 8px 32px rgba(244, 123, 32, 0.25)",
            width: 140,
            height: 140,
          }}
        >
          <img src={logo1} alt="SIMBA" className="w-full h-full object-contain" />
        </div>

        <div className="flex flex-col items-center gap-2">
          <h1
            style={{
              fontSize: "36px",
              fontWeight: 900,
              color: "#2D3047",
              fontFamily: "'Nunito', sans-serif",
              letterSpacing: "-0.5px",
            }}
          >
            SIMBA
          </h1>
          <div
            className="px-4 py-1.5 rounded-full"
            style={{ background: "linear-gradient(90deg, #F47B20, #FFC72C)" }}
          >
            <p
              style={{
                fontSize: "13px",
                fontWeight: 700,
                color: "white",
                fontFamily: "'Nunito', sans-serif",
                letterSpacing: "0.2px",
              }}
            >
              Grow Happy, Grow Healthy 🌟
            </p>
          </div>
        </div>

        <p
          style={{
            fontSize: "13px",
            color: "#9BA3B8",
            fontFamily: "'Nunito', sans-serif",
            fontWeight: 600,
            textAlign: "center",
          }}
        >
          Your toddler's health companion
        </p>
      </div>

      <div className="absolute bottom-16 flex gap-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="rounded-full animate-pulse"
            style={{
              width: 8,
              height: 8,
              background: i === 0 ? "#F47B20" : i === 1 ? "#FFC72C" : "#5CC8C2",
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}