"use client";

import { useProductStore } from "@/app/_zustand/store";
import toast from "react-hot-toast";
import Image from "next/image";
import Link from "next/link";
import { FaCheck, FaCircleQuestion, FaXmark } from "react-icons/fa6";
import QuantityInputCart from "@/components/QuantityInputCart";
import { sanitize } from "@/lib/sanitize";
import styled from "styled-components";
import { PrimaryLink } from "@/components/design-system";
import { formatVnd, formatVndTotal } from "@/lib/currency";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  cartStatusMessage,
  type CartItemStatus,
  validateCartItems,
} from "@/lib/cartValidation";
import { normalizeCatalogImage } from "@/lib/publicCatalog";

const CartForm = styled.form`
  margin-top: 2rem;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 380px;
  gap: 2rem;

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
  }
`;

const Panel = styled.section`
  background: rgba(7, 7, 7, 0.96);
  border: 1px solid rgba(255, 106, 0, 0.22);
  box-shadow: 0 20px 46px rgba(0, 0, 0, 0.45);
`;

const CartList = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
`;

const CartRow = styled.li`
  display: grid;
  grid-template-columns: 150px 1fr;
  gap: 1.25rem;
  padding: 1.2rem;
  border-bottom: 1px solid rgba(255, 106, 0, 0.08);

  @media (max-width: 620px) {
    grid-template-columns: 1fr;
  }
`;

const ItemBody = styled.div`
  display: grid;
  gap: 0.75rem;
`;

const ItemTop = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 1rem;
`;

const ItemTitle = styled(Link)`
  color: rgba(255, 255, 255, 0.88);
  font-style: italic;
  font-weight: 900;
  text-decoration: none;
  text-transform: uppercase;

  &:hover {
    color: #e85d00;
  }
`;

const Muted = styled.p`
  margin: 0;
  color: rgba(255, 255, 255, 0.56);
  font-size: 0.9rem;
`;

const Price = styled.p`
  margin: 0;
  color: #f47912;
  font-size: 1.1rem;
  font-weight: 900;
`;

const ValidationWarning = styled.p`
  margin: 0;
  padding: 0.65rem 0.75rem;
  border-left: 3px solid #e85d00;
  background: rgba(232, 93, 0, 0.1);
  color: #fff;
  font-size: 0.82rem;
  line-height: 1.5;
`;

const CheckoutLink = styled(PrimaryLink)<{ $disabled: boolean }>`
  width: 100%;
  pointer-events: ${({ $disabled }) => ($disabled ? "none" : "auto")};
  opacity: ${({ $disabled }) => ($disabled ? 0.45 : 1)};
`;

const RemoveButton = styled.button`
  display: inline-grid;
  width: 36px;
  height: 36px;
  place-items: center;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 106, 0, 0.16);
  color: rgba(255, 255, 255, 0.56);
  cursor: pointer;

  &:hover {
    color: #e85d00;
    border-color: rgba(255, 106, 0, 0.36);
  }
`;

const Summary = styled(Panel)`
  padding: 1.4rem;
  align-self: start;
  background: rgba(33, 30, 28, 0.58);
`;

const SummaryTitle = styled.h2`
  margin: 0;
  color: rgba(255, 255, 255, 0.88);
  font-style: italic;
  font-weight: 900;
  text-transform: uppercase;
`;

const SummaryList = styled.dl`
  display: grid;
  gap: 1rem;
  margin: 1.4rem 0 0;

  div {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    padding-top: 1rem;
    border-top: 1px solid rgba(255, 106, 0, 0.12);
  }

  dt {
    color: rgba(255, 255, 255, 0.56);
  }

  dd {
    margin: 0;
    color: rgba(255, 255, 255, 0.88);
    font-weight: 900;
  }
`;

export const CartModule = () => {
  const {
    products,
    removeFromCart,
    updateCartPrice,
    total,
    allQuantity,
  } = useProductStore();
  const [statuses, setStatuses] = useState<Record<string, CartItemStatus>>({});
  const [validationFailed, setValidationFailed] = useState(false);
  const [validating, setValidating] = useState(true);

  const validate = useCallback(async () => {
    if (products.length === 0) {
      setStatuses({});
      setValidationFailed(false);
      setValidating(false);
      return;
    }
    setValidating(true);
    try {
      const result = await validateCartItems(products);
      setStatuses(
        Object.fromEntries(result.items.map((item) => [item.productId, item.status]))
      );
      for (const item of result.items) {
        if (item.priceChanged && item.status !== "NOT_FOUND") {
          updateCartPrice(item.productId, item.currentPrice);
        }
      }
      setValidationFailed(false);
    } catch {
      setValidationFailed(true);
      toast.error("Không thể xác minh giỏ hàng, vui lòng thử lại");
    } finally {
      setValidating(false);
    }
  }, [products, updateCartPrice]);

  useEffect(() => {
    void validate();
  }, [validate]);

  const checkoutBlocked = useMemo(
    () =>
      validating ||
      validationFailed ||
      products.some((product) => (statuses[product.id] ?? "OK") !== "OK"),
    [products, statuses, validating, validationFailed]
  );

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.debug("[cart] Trạng thái giỏ hàng:", {
        products,
        distinctItems: products.length,
        allQuantity,
        total,
      });
    }
  }, [products, allQuantity, total]);

  const handleRemoveItem = (id: string) => {
    removeFromCart(id);
    toast.success("Đã xóa sản phẩm khỏi giỏ hàng");
  };

  if (products.length === 0) {
    return (
      <Panel style={{ marginTop: "2rem", padding: "3rem 1.5rem", textAlign: "center" }}>
        <h2 className="text-2xl font-black uppercase italic text-white">
          Giỏ hàng đang trống
        </h2>
        <p className="mt-3 text-white/55">
          Hãy thêm sản phẩm bạn yêu thích vào giỏ hàng.
        </p>
        <div className="mt-6">
          <PrimaryLink href="/shop">Tiếp tục mua sắm</PrimaryLink>
        </div>
      </Panel>
    );
  }

  return (
    <CartForm>
      <Panel aria-labelledby="cart-heading">
        <h2 id="cart-heading" className="sr-only">
          Sản phẩm trong giỏ hàng
        </h2>
        <CartList role="list">
          {products.map((product) => (
            <CartRow key={product.id}>
              <Image
                width={192}
                height={192}
                src={normalizeCatalogImage(product.image)}
                alt={sanitize(product.title)}
                style={{ width: "100%", maxHeight: 150, objectFit: "contain", background: "rgba(255,255,255,0.03)" }}
              />
              <ItemBody>
                <ItemTop>
                  <div>
                    <ItemTitle href={`/product/${product.slug || product.id}`}>
                      {sanitize(product.title)}
                    </ItemTitle>
                    <Price>{formatVnd(product.price)}</Price>
                    <Muted>
                      Thành tiền:{" "}
                      <strong style={{ color: "#f47912" }}>
                        {formatVnd(product.price * product.amount)}
                      </strong>
                    </Muted>
                  </div>
                  <RemoveButton onClick={() => handleRemoveItem(product.id)} type="button">
                    <span className="sr-only">Xóa sản phẩm</span>
                    <FaXmark aria-hidden="true" />
                  </RemoveButton>
                </ItemTop>
                <QuantityInputCart product={product} />
                {(statuses[product.id] ?? "OK") === "OK" ? (
                  <Muted>
                    <FaCheck style={{ display: "inline", color: "#f47912", marginRight: 8 }} />
                    Còn hàng
                  </Muted>
                ) : (
                  <ValidationWarning>
                    {cartStatusMessage[
                      statuses[product.id] as Exclude<CartItemStatus, "OK">
                    ]}
                  </ValidationWarning>
                )}
              </ItemBody>
            </CartRow>
          ))}
        </CartList>
      </Panel>

      <Summary aria-labelledby="summary-heading">
        <SummaryTitle id="summary-heading">Tổng kết giỏ hàng</SummaryTitle>
        <SummaryList>
          <div>
            <dt>Sản phẩm trong giỏ</dt>
            <dd>{products.length} loại</dd>
          </div>
          <div>
            <dt>Tổng số lượng</dt>
            <dd>{allQuantity} món</dd>
          </div>
          <div>
            <dt>Tạm tính</dt>
            <dd>{formatVndTotal(total)}</dd>
          </div>
          <div>
            <dt>
              Phí vận chuyển <FaCircleQuestion style={{ display: "inline", opacity: 0.55 }} />
            </dt>
            <dd>Miễn phí</dd>
          </div>
          <div>
            <dt>Tổng tiền hàng</dt>
            <dd>{formatVndTotal(total)}</dd>
          </div>
        </SummaryList>
        {products.length > 0 && (
          <div style={{ marginTop: "1.5rem" }}>
            <CheckoutLink
              href="/checkout"
              $disabled={checkoutBlocked}
              aria-disabled={checkoutBlocked}
              onClick={(event) => {
                if (checkoutBlocked) event.preventDefault();
              }}
            >
              {validating ? "Đang xác minh..." : "Thanh toán"}
            </CheckoutLink>
            {validationFailed ? (
              <button
                type="button"
                onClick={() => void validate()}
                className="mt-3 w-full border border-[#e85d00] px-4 py-2 text-sm font-bold text-white"
              >
                Thử xác minh lại
              </button>
            ) : null}
          </div>
        )}
      </Summary>
    </CartForm>
  );
};
