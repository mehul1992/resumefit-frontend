import React from "react";
import GridShape from "../../components/common/GridShape";
import ThemeTogglerTwo from "../../components/common/ThemeTogglerTwo";

const features = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M10 2L12.09 7.26L18 8.27L14 12.14L14.91 18L10 15.27L5.09 18L6 12.14L2 8.27L7.91 7.26L10 2Z" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
      </svg>
    ),
    title: "AI-Powered Tailoring",
    desc: "Match your resume to any job description in under 30 seconds.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M17 3H3v14h14V3z" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
        <path d="M7 7h6M7 10h6M7 13h4" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    title: "ATS Score Checker",
    desc: "See exactly how well your resume passes applicant tracking systems.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M10 18a8 8 0 100-16 8 8 0 000 16z" stroke="white" strokeWidth="1.5"/>
        <path d="M7 10l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: "One-Click Export",
    desc: "Download polished PDFs ready to send to recruiters instantly.",
  },
];

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative p-6 bg-white z-1 dark:bg-gray-900 sm:p-0">
      <div className="relative flex flex-col justify-center w-full h-screen lg:flex-row dark:bg-gray-900 sm:p-0">
        {children}

        {/* Right panel */}
        <div className="items-center hidden w-full h-full lg:w-1/2 bg-brand-950 dark:bg-white/5 lg:flex lg:flex-col lg:justify-center">
          <div className="relative z-10 flex flex-col items-center max-w-sm px-8">
            <GridShape />

            {/* Brand */}
            <div className="flex items-center gap-2 mb-10">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/10">
                <svg width="22" height="22" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M4 3h8l4 4v10H4V3z" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
                  <path d="M12 3v4h4" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
                  <path d="M7 10h6M7 13h4" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <span className="text-2xl font-bold text-white">ResumeFit</span>
            </div>

            <h2 className="mb-3 text-2xl font-semibold text-center text-white">
              Land more interviews
            </h2>
            <p className="mb-10 text-sm text-center text-gray-400">
              Join 10,000+ job seekers who tailored their resume with AI and heard back faster.
            </p>

            {/* Feature list */}
            <div className="w-full space-y-5">
              {features.map((f) => (
                <div key={f.title} className="flex items-start gap-4">
                  <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/10 shrink-0">
                    {f.icon}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{f.title}</p>
                    <p className="text-sm text-gray-400">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Social proof */}
            <div className="flex items-center gap-3 mt-12 p-4 rounded-xl bg-white/5 w-full">
              <div className="flex -space-x-2">
                {["bg-pink-400", "bg-sky-400", "bg-emerald-400"].map((c, i) => (
                  <div key={i} className={`w-8 h-8 rounded-full ${c} border-2 border-brand-950 flex items-center justify-center text-xs font-bold text-white`}>
                    {["J", "M", "S"][i]}
                  </div>
                ))}
              </div>
              <p className="text-sm text-gray-300">
                <span className="font-semibold text-white">2,400+</span> resumes tailored this week
              </p>
            </div>
          </div>
        </div>

        <div className="fixed z-50 hidden bottom-6 right-6 sm:block">
          <ThemeTogglerTwo />
        </div>
      </div>
    </div>
  );
}
