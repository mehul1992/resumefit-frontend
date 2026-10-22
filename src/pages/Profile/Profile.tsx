import PageMeta from "../../components/common/PageMeta";
import PageBreadCrumb from "../../components/common/PageBreadCrumb";
import ProfileSummaryCard from "./ProfileSummaryCard";
import PersonalInfoCard from "./PersonalInfoCard";
import PasswordCard from "./PasswordCard";
import DeleteAccountCard from "./DeleteAccountCard";

export default function Profile() {
  return (
    <>
      <PageMeta title="Profile | ResumeFit" description="Manage your ResumeFit profile and account" />
      <div className="max-w-[960px] text-sm">
        <PageBreadCrumb pageTitle="Profile" />
        <div className="flex flex-col gap-6">
          <ProfileSummaryCard />
          <PersonalInfoCard />
          <PasswordCard />
          <DeleteAccountCard />
        </div>
      </div>
    </>
  );
}
