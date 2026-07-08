"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import toast from "react-hot-toast";
import styled from "styled-components";
import { FaGift, FaPhone, FaRegEnvelope, FaRegUser } from "react-icons/fa6";
import { useI18n } from "./LanguageProvider";

const Bar = styled.div`
  height: 36px;
  background: #0d0d0d;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0;
  text-transform: uppercase;

  @media (max-width: 760px) {
    height: auto;
  }
`;

const Inner = styled.div`
  width: min(100%, 1180px);
  height: 100%;
  min-height: 36px;
  margin: 0 auto;
  padding: 0 clamp(1rem, 3vw, 2rem);
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 1rem;

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
    justify-items: center;
    padding-block: 0.45rem;
    gap: 0.35rem;
  }
`;

const Row = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 1rem;
  min-width: 0;

  &:last-child {
    justify-content: flex-end;
  }

  @media (max-width: 760px) {
    justify-content: center;
    flex-wrap: wrap;

    &:last-child {
      justify-content: center;
    }
  }
`;

const Item = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.42rem;
  white-space: nowrap;

  svg {
    color: #e85d00;
    font-size: 0.82rem;
  }

  a,
  button {
    display: inline-flex;
    align-items: center;
    gap: 0.42rem;
    background: none;
    border: 0;
    color: inherit;
    cursor: pointer;
    font: inherit;
    padding: 0;
    text-decoration: none;
    text-transform: uppercase;
    transition: color 160ms ease;
  }

  a:hover,
  button:hover {
    color: #e85d00;
  }

  a:focus-visible,
  button:focus-visible {
    outline: 2px solid #f47912;
    outline-offset: 3px;
  }
`;

const Promo = styled(Item)`
  color: #e85d00;
  justify-content: center;
  text-align: center;
`;

const HeaderTop = () => {
  const { data: session } = useSession();
  const { t } = useI18n();

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/", redirect: false });
    toast.success("Logout successful!");
    window.location.assign("/");
  };

  return (
    <Bar>
      <Inner>
        <Row>
          <Item>
            <FaPhone />
            <span>+381 61 123 321</span>
          </Item>
          <Item>
            <FaRegEnvelope />
            <span>test@email.com</span>
          </Item>
        </Row>
        <Promo>
          <FaGift />
          <span>{t("topbar.shipping")}</span>
        </Promo>
        <Row>
          {!session ? (
            <Item>
              <Link href="/login">
                <FaRegUser />
                <span>{t("common.loginRegister")}</span>
              </Link>
            </Item>
          ) : (
            <>
              <Item>
                <span>{session.user?.email}</span>
              </Item>
              <Item>
                <button type="button" onClick={handleLogout}>
                  <FaRegUser />
                  <span>{t("topbar.logout")}</span>
                </button>
              </Item>
            </>
          )}
        </Row>
      </Inner>
    </Bar>
  );
};

export default HeaderTop;
