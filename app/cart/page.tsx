
import {
  SectionTitle
} from "@/components";
import { Loader } from "@/components/Loader";
import { CartModule } from "@/components/modules/cart";
import { SectionShell, Wrapper } from "@/components/design-system";
import { Suspense } from "react";

const CartPage = () => {
  return (
    <div>
      <SectionTitle title="Cart Page" path="Home | Cart" />
      <SectionShell>
        <Wrapper>
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl uppercase italic">
            Shopping Cart
          </h1>
          <Suspense fallback={<Loader />}>
            <CartModule />
          </Suspense>
        </Wrapper>
      </SectionShell>
    </div>
  );
};

export default CartPage;
