import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import SignUpForm from "../../components/auth/SignUpForm";

export default function SignUp() {
  return (
    <>
      <PageMeta
        title="Create Your Account | CVforTech - AI Resume Tailoring"
        description="Sign up for CVforTech and start tailoring your resume to every job description with AI."
      />
      <AuthLayout>
        <SignUpForm />
      </AuthLayout>
    </>
  );
}
