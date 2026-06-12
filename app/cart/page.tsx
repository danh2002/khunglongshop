
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
      <SectionTitle title="Giỏ Hàng" path="TRANG CHỦ | GIỎ HÀNG" />
      <SectionShell>
        <Wrapper>
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl uppercase italic">
            Giỏ hàng của bạn
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
