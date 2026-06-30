"use client";
import SectionTitle from "@/components/SectionTitle";
import { useProductStore } from "../_zustand/store";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import styled from "styled-components";
import { sectionPattern } from "@/components/design-system";
import { formatVnd, formatVndTotal } from "@/lib/currency";
import { validateCartItems } from "@/lib/cartValidation";
import { normalizeCatalogImage } from "@/lib/publicCatalog";

const checkoutFieldErrors: Record<string, string> = {
  name: "Họ không hợp lệ",
  lastname: "Tên không hợp lệ",
  email: "Địa chỉ email không hợp lệ",
  phone: "Số điện thoại không hợp lệ",
  company: "Tên công ty không hợp lệ",
  address: "Địa chỉ không hợp lệ",
  apartment: "Số nhà hoặc tòa nhà không hợp lệ",
  city: "Thành phố không hợp lệ",
  country: "Quốc gia không hợp lệ",
  postalCode: "Mã bưu điện không hợp lệ",
  total: "Tổng giá trị đơn hàng không hợp lệ",
  status: "Trạng thái đơn hàng không hợp lệ",
};

const getCheckoutFieldError = (field?: string) =>
  checkoutFieldErrors[field || ""] || "Thông tin đơn hàng không hợp lệ";

const CheckoutTheme = styled.div`
  ${sectionPattern}
  min-height: 100vh;
  background: #070707;
  color: #ffffff;
`;

const CheckoutLayout = styled.main`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 420px;
  gap: 40px;
  width: 100%;
  max-width: 1100px;
  margin: 0 auto;
  padding: 40px 24px 80px;

  @media (max-width: 768px) {
    grid-template-columns: minmax(0, 1fr);
    gap: 28px;
    padding: 28px 16px 56px;
  }
`;

const CheckoutForm = styled.form`
  display: grid;
  gap: 36px;
  min-width: 0;
`;

const FormSection = styled.section`
  min-width: 0;
`;

const SectionHeading = styled.h2`
  margin: 0 0 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid #1a1a1a;
  color: #e85d00;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 2px;
  text-transform: uppercase;
`;

const FieldGrid = styled.div`
  display: grid;
  gap: 18px;
`;

const ContactGrid = styled(FieldGrid)`
  grid-template-columns: repeat(2, minmax(0, 1fr));

  @media (max-width: 600px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

const TwoColumnRow = styled(FieldGrid)`
  grid-template-columns: repeat(2, minmax(0, 1fr));

  @media (max-width: 600px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

const ThreeColumnRow = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;

  @media (max-width: 600px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

const Field = styled.div`
  min-width: 0;
`;

const FieldLabel = styled.label`
  display: block;
  margin-bottom: 6px;
  color: #aaaaaa;
  font-size: 12px;
`;

const InlineOptions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  margin-bottom: 18px;
`;

const OptionLabel = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: rgba(255, 255, 255, 0.84);
  font-size: 15px;
  cursor: pointer;

  input {
    width: 15px;
    height: 15px;
    accent-color: #e85d00;
  }
`;

const AddressPanel = styled.div`
  display: grid;
  gap: 16px;
  margin-top: 14px;
  padding: 18px;
  border: 1px solid rgba(255, 106, 0, 0.14);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.055);
`;

const fieldStyles = `
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #2a2a2a;
  border-radius: 8px;
  background: #111111;
  color: #ffffff;
  font-size: 14px;
  transition: border-color 0.2s, box-shadow 0.2s;

  &:focus {
    border-color: #e85d00;
    outline: none;
    box-shadow: 0 0 0 2px rgba(232, 93, 0, 0.15);
  }

  &::placeholder {
    color: #555555;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
`;

const TextInput = styled.input`
  ${fieldStyles}
`;

const SelectInput = styled.select`
  ${fieldStyles}
  appearance: auto;
`;

const TextArea = styled.textarea`
  ${fieldStyles}
  min-height: 120px;
  resize: vertical;
`;

const PaymentNotice = styled.div`
  padding: 16px;
  border: 1px solid rgba(232, 93, 0, 0.25);
  border-radius: 8px;
  background: rgba(232, 93, 0, 0.07);

  strong {
    display: block;
    margin-bottom: 6px;
    color: #e85d00;
    font-size: 13px;
    text-transform: uppercase;
  }

  p {
    margin: 0;
    color: #aaaaaa;
    font-size: 13px;
    line-height: 1.6;
  }
`;

const SummaryColumn = styled.aside`
  min-width: 0;
`;

const SummaryCard = styled.section`
  position: sticky;
  top: 100px;
  padding: 24px;
  border: 1px solid #1e1e1e;
  border-radius: 12px;
  background: #111111;

  @media (max-width: 768px) {
    position: static;
  }
`;

const SummaryTitle = styled.h2`
  margin: 0 0 18px;
  color: #ffffff;
  font-size: 18px;
  font-weight: 700;
`;

const ProductList = styled.ul`
  display: grid;
  gap: 16px;
  margin: 0;
  padding: 0;
  list-style: none;
`;

const ProductRow = styled.li`
  display: grid;
  grid-template-columns: 64px minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
`;

const ProductThumbnail = styled(Image)`
  width: 64px;
  height: 64px;
  border-radius: 8px;
  background: #191919;
  object-fit: cover;
`;

const ProductName = styled.h3`
  margin: 0 0 7px;
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.35;
`;

const QuantityBadge = styled.span`
  display: inline-flex;
  border-radius: 999px;
  background: rgba(232, 93, 0, 0.15);
  padding: 3px 8px;
  color: #e85d00;
  font-size: 11px;
  font-weight: 700;
`;

const ProductPrice = styled.p`
  margin: 0;
  color: #e85d00;
  font-size: 14px;
  font-weight: 700;
  text-align: right;
  white-space: nowrap;
`;

const Divider = styled.div`
  margin: 16px 0;
  border-top: 1px solid #1e1e1e;
`;

const Totals = styled.dl`
  display: grid;
  gap: 12px;
  margin: 0;
`;

const TotalRow = styled.div<{ $grand?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  font-size: ${({ $grand }) => ($grand ? "17px" : "14px")};

  dt {
    color: ${({ $grand }) => ($grand ? "#ffffff" : "#888888")};
    font-weight: ${({ $grand }) => ($grand ? 700 : 400)};
  }

  dd {
    margin: 0;
    color: ${({ $grand }) => ($grand ? "#e85d00" : "#ffffff")};
    font-weight: 600;
  }
`;

const PlaceOrderButton = styled.button`
  width: 100%;
  margin-top: 20px;
  padding: 16px;
  border: 0;
  border-radius: 8px;
  background: #e85d00;
  color: #ffffff;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 2px;
  cursor: pointer;
  transition: background 0.2s, transform 0.2s;

  &:hover:not(:disabled) {
    background: #ff6a00;
    transform: translateY(-1px);
  }

  &:disabled {
    background: #333333;
    cursor: not-allowed;
  }
`;

const TrustBadges = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
  margin-top: 18px;
  color: #666666;
  font-size: 12px;
  text-align: center;

  span {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  @media (max-width: 420px) {
    flex-direction: column;
    align-items: center;
  }
`;

function splitCustomerName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) {
    const fallback = parts[0] || "";
    return { name: fallback, lastname: fallback };
  }

  const name = parts.slice(0, -1).join(" ");
  const lastname = parts[parts.length - 1];

  return {
    name: name.length >= 2 ? name : fullName.trim(),
    lastname: lastname.length >= 2 ? lastname : fullName.trim(),
  };
}

const CheckoutPage = () => {
  const { data: session } = useSession();
  const [customerTitle, setCustomerTitle] = useState<"Anh" | "Chị">("Anh");
  const [checkoutForm, setCheckoutForm] = useState({
    name: "",
    lastname: "",
    phone: "",
    email: "",
    company: "",
    adress: "",
    apartment: "",
    city: "",
    country: "",
    postalCode: "",
    orderNotice: "",
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cartValidated, setCartValidated] = useState(false);
  const [isValidatingCart, setIsValidatingCart] = useState(true);
  const [cartHydrated, setCartHydrated] = useState(false);
  const { products, total, clearCart, updateCartPrice } = useProductStore();
  const router = useRouter();
  const idempotencyKeyRef = useRef("");

  // Add validation functions that match server requirements
  const validateForm = () => {
    const errors: string[] = [];
    const fullName = checkoutForm.name.trim();

    if (!fullName || fullName.length < 2) {
      errors.push("Vui lòng nhập họ tên người nhận");
    }

    const phoneDigitsValue = checkoutForm.phone.replace(/[^0-9]/g, "");
    if (!checkoutForm.phone.trim() || phoneDigitsValue.length < 10) {
      errors.push("Vui lòng nhập số điện thoại hợp lệ");
    }

    if (!checkoutForm.country.trim()) {
      errors.push("Vui lòng chọn Tỉnh, Thành phố");
    }

    if (!checkoutForm.city.trim()) {
      errors.push("Vui lòng chọn Quận, Huyện");
    }

    if (!checkoutForm.postalCode.trim() || checkoutForm.postalCode.trim().length < 3) {
      errors.push("Vui lòng chọn Phường, Xã");
    }

    if (!checkoutForm.adress.trim() || checkoutForm.adress.trim().length < 5) {
      errors.push("Vui lòng nhập số nhà, tên đường");
    }

    return errors;
  };

  const makePurchase = async () => {
    setIsValidatingCart(true);
    try {
      const cartValidation = await validateCartItems(products);
      for (const item of cartValidation.items) {
        if (item.priceChanged && item.status !== "NOT_FOUND") {
          updateCartPrice(item.productId, item.currentPrice);
        }
      }
      if (!cartValidation.valid) {
        setCartValidated(false);
        toast.error("Giỏ hàng có sản phẩm không còn khả dụng");
        router.push("/cart");
        return;
      }
      setCartValidated(true);
    } catch {
      setCartValidated(false);
      toast.error("Không thể xác minh giỏ hàng, vui lòng thử lại");
      return;
    } finally {
      setIsValidatingCart(false);
    }

    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      validationErrors.forEach(error => {
        toast.error(error);
      });
      return;
    }

    if (products.length === 0) {
      toast.error("Giỏ hàng của bạn đang trống");
      return;
    }

    if (!session?.user?.id || !session.user.email) {
      router.push("/login?callbackUrl=/checkout");
      return;
    }

    setIsSubmitting(true);

    try {
      if (!idempotencyKeyRef.current) {
        idempotencyKeyRef.current = crypto.randomUUID();
      }

      const customerName = splitCustomerName(checkoutForm.name);
      const fullAddress = [
        checkoutForm.adress.trim(),
        checkoutForm.postalCode.trim(),
        checkoutForm.city.trim(),
        checkoutForm.country.trim(),
      ].filter(Boolean).join(", ");
      const orderNotice = [
        `Xưng hô: ${customerTitle}`,
        checkoutForm.orderNotice.trim(),
      ].filter(Boolean).join(" | ");

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idempotencyKey: idempotencyKeyRef.current,
          shipping: {
            name: customerName.name,
            lastname: customerName.lastname,
            phone: checkoutForm.phone.trim(),
            email: session.user.email.trim().toLowerCase(),
            company: "Khách lẻ",
            address: fullAddress,
            apartment: checkoutForm.adress.trim(),
            postalCode: checkoutForm.postalCode.trim(),
            city: checkoutForm.city.trim(),
            country: checkoutForm.country.trim(),
            orderNotice,
          },
          items: products.map((product) => ({
            productId: product.id,
            quantity: product.amount,
          })),
        }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        if (response.status === 401) {
          router.push("/login?callbackUrl=/checkout");
          return;
        }
        const messages: Record<string, string> = {
          INSUFFICIENT_STOCK: "Một sản phẩm không còn đủ số lượng.",
          BLIND_BOX_POOL_UNAVAILABLE: "Túi mù chưa có phiên bản tỷ lệ khả dụng.",
          RATE_LIMITED: "Bạn thao tác quá nhanh. Vui lòng thử lại sau một phút.",
          IDEMPOTENCY_KEY_REUSED: "Phiên đặt hàng đã được sử dụng với dữ liệu khác.",
        };
        toast.error(messages[data?.error] || "Không thể tạo đơn hàng. Vui lòng thử lại.");
        return;
      }

      const orderId = data?.order?.id as string | undefined;
      if (!orderId) throw new Error("ORDER_ID_MISSING");

      clearCart();
      idempotencyKeyRef.current = "";
      window.dispatchEvent(new CustomEvent("orderCompleted"));
      toast.success("Đặt hàng thành công!");
      router.push(`/order-confirmation/${orderId}`);
    } catch (error) {
      console.error("Atomic checkout failed:", error);
      toast.error("Không thể tạo đơn hàng. Vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    setCartHydrated(useProductStore.persist.hasHydrated());
    const unsubscribe = useProductStore.persist.onFinishHydration(() => {
      setCartHydrated(true);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!cartHydrated) return;

    if (products.length === 0) {
      toast.error("Giỏ hàng của bạn đang trống");
      router.push("/cart");
    }
  }, [cartHydrated, products.length, router]);

  useEffect(() => {
    if (!cartHydrated) return;
    if (products.length === 0) {
      setIsValidatingCart(false);
      return;
    }

    let cancelled = false;
    setIsValidatingCart(true);
    validateCartItems(products)
      .then((result) => {
        if (cancelled) return;
        for (const item of result.items) {
          if (item.priceChanged && item.status !== "NOT_FOUND") {
            updateCartPrice(item.productId, item.currentPrice);
          }
        }
        setCartValidated(result.valid);
        if (!result.valid) {
          toast.error("Giỏ hàng có sản phẩm không còn khả dụng");
        }
      })
      .catch(() => {
        if (cancelled) return;
        setCartValidated(false);
        toast.error("Không thể xác minh giỏ hàng, vui lòng thử lại");
      })
      .finally(() => {
        if (!cancelled) setIsValidatingCart(false);
      });
    return () => {
      cancelled = true;
    };
  }, [cartHydrated, products, updateCartPrice]);

  return (
    <CheckoutTheme>
      <SectionTitle title="Thanh Toán" path="TRANG CHỦ | GIỎ HÀNG | THANH TOÁN" />

      <CheckoutLayout>
        <h1 className="sr-only">Thông tin đơn hàng</h1>

        <CheckoutForm onSubmit={(event) => event.preventDefault()}>
          <FormSection aria-labelledby="buyer-info-heading">
            <SectionHeading id="buyer-info-heading">Thông tin khách mua hàng</SectionHeading>
            <InlineOptions>
              <OptionLabel>
                <input
                  type="radio"
                  name="customer-title"
                  value="Anh"
                  checked={customerTitle === "Anh"}
                  onChange={() => setCustomerTitle("Anh")}
                  disabled={isSubmitting}
                />
                Anh
              </OptionLabel>
              <OptionLabel>
                <input
                  type="radio"
                  name="customer-title"
                  value="Chị"
                  checked={customerTitle === "Chị"}
                  onChange={() => setCustomerTitle("Chị")}
                  disabled={isSubmitting}
                />
                Chị
              </OptionLabel>
            </InlineOptions>
            <ContactGrid>
              <Field>
                <FieldLabel htmlFor="full-name-input">Nhập họ tên</FieldLabel>
                <TextInput
                  value={checkoutForm.name}
                  onChange={(event) => setCheckoutForm({ ...checkoutForm, name: event.target.value })}
                  type="text"
                  id="full-name-input"
                  name="full-name"
                  autoComplete="name"
                  placeholder="Nhập họ tên"
                  required
                  disabled={isSubmitting}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="phone-input">Số điện thoại</FieldLabel>
                <TextInput
                  value={checkoutForm.phone}
                  onChange={(event) => setCheckoutForm({ ...checkoutForm, phone: event.target.value })}
                  type="tel"
                  id="phone-input"
                  name="phone"
                  autoComplete="tel"
                  placeholder="Nhập số điện thoại"
                  required
                  disabled={isSubmitting}
                />
              </Field>
            </ContactGrid>
          </FormSection>

          <FormSection aria-labelledby="delivery-method-heading">
            <SectionHeading id="delivery-method-heading">Chọn cách nhận hàng</SectionHeading>
            <InlineOptions>
              <OptionLabel>
                <input type="radio" name="delivery-method" checked readOnly />
                Giao hàng tận nơi
              </OptionLabel>
            </InlineOptions>
            <AddressPanel>
              <TwoColumnRow>
                <Field>
                  <FieldLabel htmlFor="province-select">Tỉnh, Thành phố</FieldLabel>
                  <SelectInput
                    id="province-select"
                    name="province"
                    required
                    disabled={isSubmitting}
                    value={checkoutForm.country}
                    onChange={(event) => setCheckoutForm({ ...checkoutForm, country: event.target.value })}
                  >
                    <option value="">Chọn Tỉnh, Thành phố</option>
                    <option value="TP. Hồ Chí Minh">TP. Hồ Chí Minh</option>
                    <option value="Hà Nội">Hà Nội</option>
                    <option value="Đà Nẵng">Đà Nẵng</option>
                    <option value="Bình Dương">Bình Dương</option>
                    <option value="Đồng Nai">Đồng Nai</option>
                    <option value="Khác">Khác</option>
                  </SelectInput>
                </Field>

                <Field>
                  <FieldLabel htmlFor="district-input">Quận, Huyện</FieldLabel>
                  <TextInput
                    id="district-input"
                    name="district"
                    required
                    disabled={isSubmitting}
                    value={checkoutForm.city}
                    onChange={(event) => setCheckoutForm({ ...checkoutForm, city: event.target.value })}
                    placeholder="Chọn Quận, Huyện"
                  />
                </Field>
              </TwoColumnRow>

              <TwoColumnRow>
                <Field>
                  <FieldLabel htmlFor="ward-input">Phường, Xã</FieldLabel>
                  <TextInput
                    id="ward-input"
                    name="ward"
                    required
                    disabled={isSubmitting}
                    value={checkoutForm.postalCode}
                    onChange={(event) => setCheckoutForm({ ...checkoutForm, postalCode: event.target.value })}
                    placeholder="Chọn Phường, Xã"
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="street-address-input">Số nhà, tên đường</FieldLabel>
                  <TextInput
                    id="street-address-input"
                    name="street-address"
                    autoComplete="street-address"
                    required
                    disabled={isSubmitting}
                    value={checkoutForm.adress}
                    onChange={(event) => setCheckoutForm({ ...checkoutForm, adress: event.target.value })}
                    placeholder="Số nhà, tên đường"
                  />
                </Field>
              </TwoColumnRow>
            </AddressPanel>

            <Field style={{ marginTop: 24 }}>
              <FieldLabel htmlFor="order-notice">Lưu ý, yêu cầu khác</FieldLabel>
              <TextInput
                id="order-notice"
                name="order-notice"
                disabled={isSubmitting}
                value={checkoutForm.orderNotice}
                onChange={(event) => setCheckoutForm({ ...checkoutForm, orderNotice: event.target.value })}
                placeholder="Lưu ý, yêu cầu khác (Không bắt buộc)"
              />
            </Field>
          </FormSection>

        </CheckoutForm>

        <SummaryColumn>
          <SummaryCard aria-labelledby="summary-heading">
            <SummaryTitle id="summary-heading">Tóm tắt đơn hàng</SummaryTitle>
            <ProductList>
              {products.map((product) => (
                <ProductRow key={product.id}>
                  <ProductThumbnail
                    src={normalizeCatalogImage(product.image)}
                    alt={product.title}
                    width={64}
                    height={64}
                  />
                  <div>
                    <ProductName>{product.title}</ProductName>
                    <QuantityBadge>x{product.amount}</QuantityBadge>
                  </div>
                  <ProductPrice>{formatVnd(product.price * product.amount)}</ProductPrice>
                </ProductRow>
              ))}
            </ProductList>

            <Divider />

            <Totals>
              <TotalRow>
                <dt>Tạm tính</dt>
                <dd>{formatVndTotal(total)}</dd>
              </TotalRow>
              <TotalRow>
                <dt>Phí vận chuyển</dt>
                <dd>Miễn phí</dd>
              </TotalRow>
              <TotalRow>
                <dt>Thuế</dt>
                <dd>Đã bao gồm</dd>
              </TotalRow>
            </Totals>

            <Divider />

            <Totals>
              <TotalRow $grand>
                <dt>Tổng cộng</dt>
                <dd>{formatVndTotal(total)}</dd>
              </TotalRow>
            </Totals>

            <PlaceOrderButton
              type="button"
              onClick={makePurchase}
              disabled={isSubmitting || isValidatingCart || !cartValidated}
            >
              {isValidatingCart
                ? "Đang xác minh giỏ hàng..."
                : isSubmitting
                  ? "Đang xử lý đơn hàng..."
                  : "Đặt hàng"}
            </PlaceOrderButton>

            <TrustBadges aria-label="Cam kết mua hàng">
              <span>🔒 Thanh toán an toàn</span>
              <span>🚚 Giao hàng toàn quốc</span>
              <span>↩️ Đổi trả trong 7 ngày</span>
            </TrustBadges>
          </SummaryCard>
        </SummaryColumn>
      </CheckoutLayout>
    </CheckoutTheme>
  );
};

export default CheckoutPage;
