"use client";

import { AnimatePresence, m } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { FaBars, FaXmark } from "react-icons/fa6";
import styled from "styled-components";
import { useWishlistStore } from "@/app/_zustand/wishlistStore";
import { smoothEase } from "./design-system";
import CartElement from "./CartElement";
import HeaderTop from "./HeaderTop";
import HeartElement from "./HeartElement";
import NotificationBell from "./NotificationBell";
import SearchInput from "./SearchInput";
import LanguageSwitcher from "./LanguageSwitcher";
import { useI18n } from "./LanguageProvider";

const brandLine = "\u0110\u1EA2O KH\u1EE6NG LONG";

const SiteHeader = styled.header`
  position: sticky;
  top: 0;
  z-index: 1000;
  background: rgba(10, 10, 10, 0.95);
  border-bottom: 1px solid rgba(255, 106, 0, 0.15);
  backdrop-filter: blur(12px);
  font-family: var(--font-body), sans-serif;
`;

const NavWrap = styled.div`
  width: min(100%, 1180px);
  height: 64px;
  margin: 0 auto;
  padding: 0 clamp(1rem, 3vw, 2rem);
  display: flex;
  align-items: center;
  gap: clamp(0.75rem, 1.5vw, 1.35rem);
  min-width: 0;

  @media (max-width: 1100px) {
    gap: 0.85rem;
  }
`;

const Logo = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  flex: 0 0 auto;
  color: #fff;
  text-decoration: none;

  &:focus-visible {
    outline: 2px solid #f47912;
    outline-offset: 5px;
  }
`;

const LogoMark = styled.span`
  width: 44px;
  height: 44px;
  display: inline-grid;
  place-items: center;
  border-radius: 50%;
  background: #e85d00;
  color: #fff;
  font-size: 1.38rem;
  line-height: 1;
  box-shadow: 0 0 24px rgba(232, 93, 0, 0.28);
`;

const LogoText = styled.span`
  display: grid;
  line-height: 1.05;

  strong {
    color: #fff;
    font-family: var(--font-display), var(--font-body), sans-serif;
    font-size: 1.08rem;
    font-style: italic;
    font-weight: 900;
    letter-spacing: 0.05rem;
    text-transform: uppercase;
    white-space: nowrap;
  }

  span {
    color: #e85d00;
    font-size: 0.72rem;
    font-weight: 800;
    letter-spacing: 0.15rem;
    text-transform: uppercase;
  }

  @media (max-width: 480px) {
    strong {
      font-size: 0.82rem;
    }
  }
`;

const SearchSlot = styled.div`
  flex: 1 1 380px;
  max-width: 420px;
  min-width: 220px;

  @media (max-width: 1100px) {
    display: none;
  }
`;

const NavLinks = styled.nav`
  display: flex;
  align-items: center;
  gap: clamp(0.85rem, 1.3vw, 1.35rem);
  margin-left: auto;
  flex: 0 0 auto;
  min-width: max-content;
  white-space: nowrap;

  @media (max-width: 1100px) {
    display: none;
  }
`;

const NavLink = styled(Link)<{ $active: boolean }>`
  position: relative;
  display: inline-flex;
  flex: 0 0 auto;
  flex-shrink: 0;
  min-width: max-content;
  padding-bottom: 2px;
  border-bottom: 2px solid ${({ $active }) => ($active ? "#e85d00" : "transparent")};
  color: ${({ $active }) => ($active ? "#e85d00" : "rgba(255, 255, 255, 0.72)")};
  font-size: 0.78rem;
  font-weight: 900;
  letter-spacing: 0.055rem;
  line-height: 1;
  text-decoration: none;
  text-transform: uppercase;
  white-space: nowrap;
  word-break: keep-all;
  transition: color 160ms ease, border-color 160ms ease;

  &:hover {
    border-color: #e85d00;
    color: #e85d00;
  }

  &:focus-visible {
    outline: 2px solid #f47912;
    outline-offset: 6px;
  }
`;

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.95rem;
  flex: 0 0 auto;
`;

const DesktopActions = styled(Actions)`
  @media (max-width: 1100px) {
    display: none;
  }
`;

const MobileActions = styled(Actions)`
  display: none;
  margin-left: auto;
  gap: 0.7rem;

  @media (max-width: 1100px) {
    display: flex;
  }
`;

const IconButton = styled.button`
  width: 40px;
  height: 40px;
  display: inline-grid;
  place-items: center;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  color: rgba(255, 255, 255, 0.82);
  cursor: pointer;
  transition: border-color 160ms ease, color 160ms ease, background 160ms ease;

  &:hover {
    background: rgba(255, 106, 0, 0.1);
    border-color: rgba(255, 106, 0, 0.35);
    color: #e85d00;
  }

  &:focus-visible {
    outline: 2px solid #f47912;
    outline-offset: 3px;
  }
`;

const DrawerOverlay = styled(m.div)`
  position: fixed;
  inset: 0;
  z-index: 1100;
  background: rgba(0, 0, 0, 0.76);
`;

const Drawer = styled(m.aside)`
  position: fixed;
  inset: 0 0 0 auto;
  z-index: 1101;
  width: min(88vw, 360px);
  padding: 1rem;
  background: rgba(10, 10, 10, 0.98);
  border-left: 1px solid rgba(255, 106, 0, 0.25);
  display: grid;
  align-content: start;
  gap: 1.2rem;
`;

const DrawerTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const DrawerLinks = styled.nav`
  display: grid;
  gap: 0.35rem;

  a {
    padding: 0.95rem 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.07);
    color: rgba(255, 255, 255, 0.78);
    font-weight: 800;
    letter-spacing: 0.08rem;
    text-decoration: none;
    text-transform: uppercase;
    white-space: nowrap;
    word-break: keep-all;
  }

  a:hover {
    color: #e85d00;
  }
`;

const AdminWrap = styled.div`
  height: 64px;
  width: min(100%, 1180px);
  margin: 0 auto;
  padding: 0 clamp(1rem, 3vw, 2rem);
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-family: var(--font-body), sans-serif;
`;

const Dropdown = styled.ul`
  position: absolute;
  right: 0;
  top: 100%;
  z-index: 10;
  width: 13rem;
  margin-top: 0.75rem;
  padding: 0.65rem;
  background: rgba(10, 10, 10, 0.96);
  border: 1px solid rgba(255, 106, 0, 0.22);
  box-shadow: 0 20px 46px rgba(0, 0, 0, 0.45);
`;

const Header = () => {
  const pathname = usePathname();
  const { wishQuantity } = useWishlistStore();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { t } = useI18n();
  const links = [
    { href: "/", label: t("common.home") },
    { href: "/shop", label: t("common.collection") },
    { href: "/account/codes", label: t("common.codes") },
    { href: "/about", label: t("common.about") },
  ];

  const handleLogout = () => {
    setTimeout(() => signOut(), 1000);
    toast.success("Logout successful!");
  };

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  const isAdmin = pathname.startsWith("/admin");
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <SiteHeader>
      <HeaderTop />
      {!isAdmin ? (
        <NavWrap>
          <Logo href="/" aria-label="Dao Khung Long Merch home">
            <LogoMark aria-hidden="true">{"\uD83E\uDD96"}</LogoMark>
            <LogoText>
              <strong>{brandLine}</strong>
              <span>Merch</span>
            </LogoText>
          </Logo>
          <SearchSlot>
            <SearchInput />
          </SearchSlot>
          <NavLinks aria-label="Primary navigation">
            {links.map((link) => (
              <NavLink key={link.href} href={link.href} $active={isActive(link.href)}>
                {link.label}
              </NavLink>
            ))}
          </NavLinks>
          <DesktopActions>
            <LanguageSwitcher />
            <HeartElement wishQuantity={wishQuantity} />
            <CartElement />
          </DesktopActions>
          <MobileActions>
            <CartElement />
            <IconButton type="button" aria-label="Open menu" onClick={() => setDrawerOpen(true)}>
              <FaBars />
            </IconButton>
          </MobileActions>
        </NavWrap>
      ) : (
        <AdminWrap>
          <Logo href="/" aria-label="Dao Khung Long Merch home">
            <LogoMark aria-hidden="true">{"\uD83E\uDD96"}</LogoMark>
            <LogoText>
              <strong>{brandLine}</strong>
              <span>Merch</span>
            </LogoText>
          </Logo>
          <Actions>
            <NotificationBell />
            <div className="dropdown dropdown-end relative">
              <div tabIndex={0} role="button" className="w-10">
                <Image
                  src="/randomuser.jpg"
                  alt="random profile photo"
                  width={40}
                  height={40}
                  className="w-full h-full rounded-full"
                />
              </div>
              <Dropdown tabIndex={0} className="dropdown-content menu">
                <li>
                  <Link href="/admin">Dashboard</Link>
                </li>
                <li>
                  <a>Profile</a>
                </li>
                <li onClick={handleLogout}>
                  <a href="#">Logout</a>
                </li>
              </Dropdown>
            </div>
          </Actions>
        </AdminWrap>
      )}
      <AnimatePresence>
        {drawerOpen ? (
          <>
            <DrawerOverlay initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDrawerOpen(false)} />
            <Drawer initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ duration: 0.24, ease: smoothEase }}>
              <DrawerTop>
                <Logo href="/" aria-label="Dao Khung Long Merch home">
                  <LogoMark aria-hidden="true">{"\uD83E\uDD96"}</LogoMark>
                  <LogoText>
                    <strong>{brandLine}</strong>
                    <span>Merch</span>
                  </LogoText>
                </Logo>
                <IconButton type="button" aria-label="Close menu" onClick={() => setDrawerOpen(false)}>
                  <FaXmark />
                </IconButton>
              </DrawerTop>
              <SearchInput />
              <DrawerLinks aria-label="Mobile navigation">
                {links.map((link) => (
                  <Link key={link.href} href={link.href}>
                    {link.label}
                  </Link>
                ))}
              </DrawerLinks>
              <Actions>
                <LanguageSwitcher />
                <HeartElement wishQuantity={wishQuantity} />
                <CartElement />
              </Actions>
            </Drawer>
          </>
        ) : null}
      </AnimatePresence>
    </SiteHeader>
  );
};

export default Header;
