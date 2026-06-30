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

const CheckoutPage = () => {
  const { data: session } = useSession();
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
    
    // Name validation
    if (!checkoutForm.name.trim() || checkoutForm.name.trim().length < 2) {
      errors.push("Họ phải có ít nhất 2 ký tự");
    }
    
    // Lastname validation
    if (!checkoutForm.lastname.trim() || checkoutForm.lastname.trim().length < 2) {
      errors.push("Tên phải có ít nhất 2 ký tự");
    }
    
    // Email validation
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if (!checkoutForm.email.trim() || !emailRegex.test(checkoutForm.email.trim())) {
      errors.push("Vui lòng nhập địa chỉ email hợp lệ");
    }
    
    // Phone validation (must be at least 10 digits)
    const phoneDigits = checkoutForm.phone.replace(/[^0-9]/g, '');
    if (!checkoutForm.phone.trim() || phoneDigits.length < 10) {
      errors.push("Số điện thoại phải có ít nhất 10 số");
    }
    
    // Company validation
    if (!checkoutForm.company.trim() || checkoutForm.company.trim().length < 5) {
      errors.push("Tên công ty phải có ít nhất 5 ký tự");
    }
    
    // Address validation
    if (!checkoutForm.adress.trim() || checkoutForm.adress.trim().length < 5) {
      errors.push("Địa chỉ phải có ít nhất 5 ký tự");
    }
    
    // Apartment validation (updated to 1 character minimum)
    if (!checkoutForm.apartment.trim() || checkoutForm.apartment.trim().length < 1) {
      errors.push("Vui lòng nhập số nhà hoặc tòa nhà");
    }
    
    // City validation
    if (!checkoutForm.city.trim() || checkoutForm.city.trim().length < 5) {
      errors.push("Tên thành phố phải có ít nhất 5 ký tự");
    }
    
    // Country validation
    if (!checkoutForm.country.trim() || checkoutForm.country.trim().length < 5) {
      errors.push("Tên quốc gia phải có ít nhất 5 ký tự");
    }
    
    // Postal code validation
    if (!checkoutForm.postalCode.trim() || checkoutForm.postalCode.trim().length < 3) {
      errors.push("Mã bưu điện phải có ít nhất 3 ký tự");
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

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idempotencyKey: idempotencyKeyRef.current,
          shipping: {
            name: checkoutForm.name.trim(),
            lastname: checkoutForm.lastname.trim(),
            phone: checkoutForm.phone.trim(),
            email: session.user.email.trim().toLowerCase(),
            company: checkoutForm.company.trim(),
            address: checkoutForm.adress.trim(),
            apartment: checkoutForm.apartment.trim(),
            postalCode: checkoutForm.postalCode.trim(),
            city: checkoutForm.city.trim(),
            country: checkoutForm.country.trim(),
            orderNotice: checkoutForm.orderNotice.trim(),
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
          <FormSection aria-labelledby="contact-info-heading">
            <SectionHeading id="contact-info-heading">Thông tin liên hệ</SectionHeading>
            <ContactGrid>
              <Field>
                <FieldLabel htmlFor="name-input">Họ * (tối thiểu 2 ký tự)</FieldLabel>
                <TextInput
                  value={checkoutForm.name}
                  onChange={(event) => setCheckoutForm({ ...checkoutForm, name: event.target.value })}
                  type="text"
                  id="name-input"
                  name="name-input"
                  autoComplete="given-name"
                  required
                  disabled={isSubmitting}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="lastname-input">Tên * (tối thiểu 2 ký tự)</FieldLabel>
                <TextInput
                  value={checkoutForm.lastname}
                  onChange={(event) => setCheckoutForm({ ...checkoutForm, lastname: event.target.value })}
                  type="text"
                  id="lastname-input"
                  name="lastname-input"
                  autoComplete="family-name"
                  required
                  disabled={isSubmitting}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="phone-input">Số điện thoại * (tối thiểu 10 số)</FieldLabel>
                <TextInput
                  value={checkoutForm.phone}
                  onChange={(event) => setCheckoutForm({ ...checkoutForm, phone: event.target.value })}
                  type="tel"
                  id="phone-input"
                  name="phone-input"
                  autoComplete="tel"
                  required
                  disabled={isSubmitting}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="email-address">Địa chỉ email *</FieldLabel>
                <TextInput
                  value={checkoutForm.email}
                  onChange={(event) => setCheckoutForm({ ...checkoutForm, email: event.target.value })}
                  type="email"
                  id="email-address"
                  name="email-address"
                  autoComplete="email"
                  required
                  disabled={isSubmitting}
                />
              </Field>
            </ContactGrid>
          </FormSection>

          <PaymentNotice>
            <strong>Thông tin thanh toán</strong>
            <p>
              Thanh toán sẽ được xử lý sau khi đơn hàng được xác nhận. Chúng tôi sẽ liên hệ để cung cấp thông tin thanh toán.
            </p>
          </PaymentNotice>

          <FormSection aria-labelledby="shipping-heading">
            <SectionHeading id="shipping-heading">Địa chỉ giao hàng</SectionHeading>
            <FieldGrid>
              <Field>
                <FieldLabel htmlFor="company">Công ty *</FieldLabel>
                <TextInput
                  type="text"
                  id="company"
                  name="company"
                  required
                  disabled={isSubmitting}
                  value={checkoutForm.company}
                  onChange={(event) => setCheckoutForm({ ...checkoutForm, company: event.target.value })}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="address">Địa chỉ *</FieldLabel>
                <TextInput
                  type="text"
                  id="address"
                  name="address"
                  autoComplete="street-address"
                  required
                  disabled={isSubmitting}
                  value={checkoutForm.adress}
                  onChange={(event) => setCheckoutForm({ ...checkoutForm, adress: event.target.value })}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="apartment">Số nhà, tòa nhà, v.v. *</FieldLabel>
                <TextInput
                  type="text"
                  id="apartment"
                  name="apartment"
                  required
                  disabled={isSubmitting}
                  value={checkoutForm.apartment}
                  onChange={(event) => setCheckoutForm({ ...checkoutForm, apartment: event.target.value })}
                />
              </Field>

              <ThreeColumnRow>
                <Field>
                  <FieldLabel htmlFor="city">Thành phố *</FieldLabel>
                  <TextInput
                    type="text"
                    id="city"
                    name="city"
                    autoComplete="address-level2"
                    required
                    disabled={isSubmitting}
                    value={checkoutForm.city}
                    onChange={(event) => setCheckoutForm({ ...checkoutForm, city: event.target.value })}
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="region">Quốc gia *</FieldLabel>
                  <TextInput
                    type="text"
                    id="region"
                    name="region"
                    autoComplete="country-name"
                    required
                    disabled={isSubmitting}
                    value={checkoutForm.country}
                    onChange={(event) => setCheckoutForm({ ...checkoutForm, country: event.target.value })}
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="postal-code">Mã bưu điện *</FieldLabel>
                  <TextInput
                    type="text"
                    id="postal-code"
                    name="postal-code"
                    autoComplete="postal-code"
                    required
                    disabled={isSubmitting}
                    value={checkoutForm.postalCode}
                    onChange={(event) => setCheckoutForm({ ...checkoutForm, postalCode: event.target.value })}
                  />
                </Field>
              </ThreeColumnRow>

              <Field>
                <FieldLabel htmlFor="order-notice">Ghi chú đơn hàng</FieldLabel>
                <TextArea
                  id="order-notice"
                  name="order-notice"
                  disabled={isSubmitting}
                  value={checkoutForm.orderNotice}
                  onChange={(event) => setCheckoutForm({ ...checkoutForm, orderNotice: event.target.value })}
                />
              </Field>
            </FieldGrid>
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
