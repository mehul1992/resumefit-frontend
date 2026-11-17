import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import SignInForm from "../../components/auth/SignInForm";

export default function SignIn() {
  return (
    <>
      <PageMeta
        title="Sign In | CVforTech - AI Resume Tailoring"
        description="Sign in to your CVforTech account and continue tailoring your resume with AI."
      />
      <AuthLayout>
        <SignInForm />
      </AuthLayout>
    </>
  );
}
