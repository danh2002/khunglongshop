import { SectionTitle } from "@/components";
import { BodyText, Card, SectionShell, Wrapper } from "@/components/design-system";

const AboutPage = () => {
  return (
    <>
      <SectionTitle title="Giới Thiệu" path="Home | Giới Thiệu" />
      <SectionShell>
        <Wrapper>
          <Card
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="p-8"
          >
            <h1 className="text-3xl font-black italic uppercase text-white mb-4">Khủng Long Shop</h1>
            <BodyText>
              Khủng Long Shop là cửa hàng phụ kiện và merch khủng long dành cho người thích sưu tầm,
              quà tặng độc lạ và các sản phẩm phong cách Jurassic. Tụi mình tập trung vào các mẫu
              móc khóa, collector item và phụ kiện có hình ảnh nổi bật, dễ mua, dễ tặng.
            </BodyText>
          </Card>
        </Wrapper>
      </SectionShell>
    </>
  );
};

export default AboutPage;
