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
  const { products, removeFromCart, calculateTotals, total } = useProductStore();

  const handleRemoveItem = (id: string) => {
    removeFromCart(id);
    calculateTotals();
    toast.success("Product removed from the cart");
  };

  return (
    <CartForm>
      <Panel aria-labelledby="cart-heading">
        <h2 id="cart-heading" className="sr-only">
          Items in your shopping cart
        </h2>
        <CartList role="list">
          {products.map((product) => (
            <CartRow key={product.id}>
              <Image
                width={192}
                height={192}
                src={product?.image ? `/${product.image}` : "/product_placeholder.jpg"}
                alt={sanitize(product.title)}
                style={{ width: "100%", maxHeight: 150, objectFit: "contain", background: "rgba(255,255,255,0.03)" }}
              />
              <ItemBody>
                <ItemTop>
                  <div>
                    <ItemTitle href="#">{sanitize(product.title)}</ItemTitle>
                    <Price>${product.price}</Price>
                  </div>
                  <RemoveButton onClick={() => handleRemoveItem(product.id)} type="button">
                    <span className="sr-only">Remove</span>
                    <FaXmark aria-hidden="true" />
                  </RemoveButton>
                </ItemTop>
                <QuantityInputCart product={product} />
                <Muted>
                  <FaCheck style={{ display: "inline", color: "#f47912", marginRight: 8 }} />
                  In stock
                </Muted>
              </ItemBody>
            </CartRow>
          ))}
        </CartList>
      </Panel>

      <Summary aria-labelledby="summary-heading">
        <SummaryTitle id="summary-heading">Order summary</SummaryTitle>
        <SummaryList>
          <div>
            <dt>Subtotal</dt>
            <dd>${total}</dd>
          </div>
          <div>
            <dt>
              Shipping estimate <FaCircleQuestion style={{ display: "inline", opacity: 0.55 }} />
            </dt>
            <dd>$5.00</dd>
          </div>
          <div>
            <dt>Tax estimate</dt>
            <dd>${total / 5}</dd>
          </div>
          <div>
            <dt>Order total</dt>
            <dd>${total === 0 ? 0 : Math.round(total + total / 5 + 5)}</dd>
          </div>
        </SummaryList>
        {products.length > 0 && (
          <div style={{ marginTop: "1.5rem" }}>
            <PrimaryLink href="/checkout" style={{ width: "100%" }}>
              Checkout
            </PrimaryLink>
          </div>
        )}
      </Summary>
    </CartForm>
  );
};
