import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router";

export function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="grid min-h-[70vh] place-items-center text-center">
      <div>
        <p className="font-display text-[10rem] font-black leading-none tracking-[-.1em] text-[#FF5A1F]">
          404
        </p>
        <h1 className="font-display text-4xl font-black">Signal not found.</h1>
        <p className="mt-3 opacity-50">This route is outside the incident graph.</p>
        <button className="btn-primary mx-auto mt-6" onClick={() => navigate("/")}>
          <ArrowLeft size={17} /> Back to dashboard
        </button>
      </div>
    </div>
  );
}
