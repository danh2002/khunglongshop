import { SectionTitle } from "@/components";
import { WishlistModule } from "@/components/modules/wishlist";
import { SectionShell, Wrapper } from "@/components/design-system";

const WishlistPage = () => {
  return (
    <>
      <SectionTitle title="Yêu Thích" path="Home | Wishlist" />
      <SectionShell>
        <Wrapper>
          <WishlistModule />
        </Wrapper>
      </SectionShell>
    </>
  );
};

export default WishlistPage;
