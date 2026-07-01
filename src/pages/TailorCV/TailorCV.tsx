import { useState, useRef } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadCrumb from "../../components/common/PageBreadCrumb";
import { Modal } from "../../components/ui/modal";
import { useModal } from "../../hooks/useModal";

// ─── Step indicators ────────────────────────────────────────────────────────

const STEPS = [
  { number: 1, label: "Upload CV" },
  { number: 2, label: "Job Description" },
  { number: 3, label: "Review & Submit" },
];

function StepBar({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center mb-10">
      {STEPS.map((step, i) => {
        const done = current > step.number;
        const active = current === step.number;
        return (
          <div key={step.number} className="flex items-center">
            {/* Circle */}
            <div className="flex flex-col items-center">
              <div
                className={`flex items-center justify-center w-9 h-9 rounded-full text-sm font-semibold transition-colors
                  ${done ? "bg-brand-500 text-white" : active ? "bg-brand-500 text-white ring-4 ring-brand-100 dark:ring-brand-500/20" : "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500"}`}
              >
                {done ? (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8l3.5 3.5L13 5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : (
                  step.number
                )}
              </div>
              <span className={`mt-2 text-xs font-medium whitespace-nowrap ${active ? "text-brand-500" : done ? "text-gray-600 dark:text-gray-400" : "text-gray-400"}`}>
                {step.label}
              </span>
            </div>
            {/* Connector */}
            {i < STEPS.length - 1 && (
              <div className={`h-0.5 w-16 sm:w-24 mx-3 mb-5 rounded transition-colors ${done ? "bg-brand-500" : "bg-gray-200 dark:bg-gray-700"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Step 1: Upload CV ───────────────────────────────────────────────────────

interface Step1Props {
  file: File | null;
  onChange: (file: File | null) => void;
}

function UploadCV({ file, onChange }: Step1Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = (f: File) => {
    if (f.type === "application/pdf" || f.name.endsWith(".docx")) {
      onChange(f);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Upload your CV</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Accepted formats: PDF or DOCX. Max size 5 MB.
        </p>
      </div>

      {/* Drop zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`flex flex-col items-center justify-center gap-4 p-10 border-2 border-dashed rounded-2xl cursor-pointer transition-colors
          ${dragging ? "border-brand-500 bg-brand-50 dark:bg-brand-500/10" : "border-gray-200 dark:border-gray-700 hover:border-brand-400 hover:bg-gray-50 dark:hover:bg-gray-800"}`}
      >
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-brand-50 dark:bg-brand-500/10">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-brand-500">
            <path d="M12 16V8M12 8l-3 3M12 8l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M3 15v4a2 2 0 002 2h14a2 2 0 002-2v-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            <span className="text-brand-500">Click to upload</span> or drag and drop
          </p>
          <p className="mt-1 text-xs text-gray-400">PDF or DOCX up to 5 MB</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
      </div>

      {/* Selected file */}
      {file && (
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-brand-50 dark:bg-brand-500/10">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-brand-500">
                <path d="M4 3h8l4 4v10H4V3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                <path d="M12 3v4h4" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-white">{file.name}</p>
              <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(0)} KB</p>
            </div>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onChange(null); }}
            className="text-gray-400 hover:text-error-500 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M4.5 4.5l9 9M13.5 4.5l-9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Step 2: Job Description ─────────────────────────────────────────────────

interface Step2Props {
  jd: string;
  onChange: (v: string) => void;
}

function JobDescription({ jd, onChange }: Step2Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Paste the job description</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Copy the full job posting and paste it below. The more detail, the better the tailoring.
        </p>
      </div>

      <div>
        <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          Job Description <span className="text-error-500">*</span>
        </label>
        <textarea
          value={jd}
          onChange={(e) => onChange(e.target.value)}
          rows={16}
          placeholder="Paste the full job description here…&#10;&#10;Example:&#10;We are looking for a Senior Frontend Engineer to join our team.&#10;Requirements:&#10;• 5+ years of React experience&#10;• Strong TypeScript skills…"
          className="w-full px-4 py-3 text-sm text-gray-800 bg-white border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 dark:bg-gray-900 dark:border-gray-700 dark:text-white dark:placeholder-gray-500 transition-colors"
        />
        <div className="flex justify-between mt-2">
          <p className="text-xs text-gray-400">Min. 100 characters recommended</p>
          <p className={`text-xs ${jd.length < 100 ? "text-gray-400" : "text-brand-500"}`}>
            {jd.length} chars
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Step 3: Review ──────────────────────────────────────────────────────────

interface Step3Props {
  file: File;
  jd: string;
}

function ReviewAndSubmit({ file, jd }: Step3Props) {
  const { isOpen, openModal, closeModal } = useModal();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Review before submitting</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Check everything looks right, then hit Submit to tailor your CV.
        </p>
      </div>

      {/* CV summary */}
      <div className="p-5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Your CV</p>
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-brand-50 dark:bg-brand-500/10 shrink-0">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-brand-500">
              <path d="M4 3h8l4 4v10H4V3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
              <path d="M12 3v4h4" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
              <path d="M7 10h6M7 13h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-800 dark:text-white">{file.name}</p>
            <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(0)} KB</p>
          </div>
          <span className="ml-auto px-2.5 py-1 text-xs font-medium rounded-full bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-400">
            Ready
          </span>
        </div>
      </div>

      {/* JD preview */}
      <div className="p-5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Job Description</p>
          <button
            onClick={openModal}
            className="flex items-center gap-1.5 text-xs font-medium text-brand-500 hover:text-brand-600 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 7s2-4 6-4 6 4 6 4-2 4-6 4-6-4-6-4z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
              <circle cx="7" cy="7" r="1.5" stroke="currentColor" strokeWidth="1.2"/>
            </svg>
            View full JD
          </button>
        </div>
        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed line-clamp-4 whitespace-pre-line">
          {jd}
        </p>
        <p className="mt-2 text-xs text-gray-400">{jd.length} characters</p>
      </div>

      {/* Info callout */}
      <div className="flex items-start gap-3 p-4 bg-brand-50 dark:bg-brand-500/10 rounded-xl border border-brand-100 dark:border-brand-500/20">
        <svg className="mt-0.5 shrink-0 text-brand-500" width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path fillRule="evenodd" clipRule="evenodd" d="M9 2a7 7 0 100 14A7 7 0 009 2zm0 5.5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 019 7.5zm0-2a.75.75 0 100 1.5.75.75 0 000-1.5z" fill="currentColor"/>
        </svg>
        <p className="text-sm text-brand-700 dark:text-brand-300">
          Our AI will analyse the job description and rewrite your CV to highlight the most relevant skills and experience.
        </p>
      </div>

      {/* Full JD Modal */}
      <Modal isOpen={isOpen} onClose={closeModal} className="max-w-2xl mx-4">
        <div className="p-6 sm:p-8">
          {/* Header */}
          <div className="flex items-start justify-between mb-6 pr-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Job Description</h3>
              <p className="mt-0.5 text-sm text-gray-400">{jd.length} characters</p>
            </div>
          </div>

          {/* Scrollable body */}
          <div className="max-h-[60vh] overflow-y-auto pr-1 no-scrollbar">
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
              {jd}
            </p>
          </div>

          {/* Footer */}
          <div className="flex justify-end mt-6 pt-5 border-t border-gray-100 dark:border-gray-800">
            <button
              onClick={closeModal}
              className="px-5 py-2.5 text-sm font-medium text-white rounded-lg bg-brand-500 hover:bg-brand-600 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function TailorCV() {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [jd, setJd] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const canNext =
    (step === 1 && file !== null) ||
    (step === 2 && jd.trim().length >= 50) ||
    step === 3;

  const handleSubmit = async () => {
    setLoading(true);
    // API call will be wired up later
    await new Promise((r) => setTimeout(r, 1500));
    setLoading(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <>
        <PageMeta title="Tailor CV | ResumeFit" description="Tailor your CV with AI" />
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
          <div className="flex items-center justify-center w-20 h-20 mb-6 rounded-full bg-success-50 dark:bg-success-500/15">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <path d="M10 20l7 7L30 13" stroke="#17b26a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h2 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">Submitted!</h2>
          <p className="mb-8 text-gray-500 dark:text-gray-400 max-w-sm">
            Your CV is being tailored. We'll have it ready for you shortly.
          </p>
          <button
            onClick={() => { setStep(1); setFile(null); setJd(""); setSubmitted(false); }}
            className="px-6 py-3 text-sm font-semibold text-white rounded-lg bg-brand-500 hover:bg-brand-600 transition-colors"
          >
            Tailor another CV
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <PageMeta title="Tailor CV | ResumeFit" description="Tailor your CV to any job description with AI" />
      <PageBreadCrumb pageTitle="Tailor CV" />

      <div className="max-w-2xl mx-auto">
        <StepBar current={step} />

        {/* Card */}
        <div className="p-6 sm:p-8 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
          {step === 1 && <UploadCV file={file} onChange={setFile} />}
          {step === 2 && <JobDescription jd={jd} onChange={setJd} />}
          {step === 3 && file && <ReviewAndSubmit file={file} jd={jd} />}

          {/* Navigation buttons */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100 dark:border-gray-800">
            <button
              onClick={() => setStep((s) => s - 1)}
              disabled={step === 1}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Back
            </button>

            {step < 3 ? (
              <button
                onClick={() => setStep((s) => s + 1)}
                disabled={!canNext}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-brand-500 rounded-lg hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Continue
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M6 12l4-4-4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-brand-500 rounded-lg hover:bg-brand-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                    </svg>
                    Processing…
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M2 8l5 5L14 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Submit & Tailor
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
