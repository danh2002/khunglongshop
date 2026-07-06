import { SectionTitle } from "@/components";
import { WishlistModule } from "@/components/modules/wishlist";
import { SectionShell, Wrapper } from "@/components/design-system";
import { authOptions } from "@/utils/authOptions";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";

const WishlistPage = async () => {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/wishlist");
  }

  return (
    <>
      <SectionTitle title="Yêu Thích" path="TRANG CHỦ | YÊU THÍCH" />
      <SectionShell>
        <Wrapper>
          <WishlistModule />
        </Wrapper>
      </SectionShell>
    </>
  );
};

export default WishlistPage;
