export default function HomeFooter() {
  return (
    <footer className="home-footer">
      <div className="footer-brand">
        <div className="footer-logo-box">
          <div className="footer-logo-circuit">
            <span className="line line-1" />
            <span className="line line-2" />
            <span className="line line-3" />
            <span className="dot dot-1" />
            <span className="dot dot-2" />
            <span className="dot dot-3" />
          </div>

          <div className="footer-logo-text">
            <div className="footer-logo-top">
              <span className="footer-logo-i">I</span>
              <span className="footer-logo-love">LOVE</span>
            </div>
            <div className="footer-logo-bottom">CPU</div>
          </div>
        </div>

        <p className="footer-desc">
          ถ้าคุณชอบคอมพิวเตอร์ เราคือเพื่อนกัน iLOVECPU
          <br />
          ร้านจำหน่ายอุปกรณ์คอมพิวเตอร์ โน้ตบุ๊ค อุปกรณ์ต่อพ่วง
          <br />
          เกมมิ่งเกียร์ รับประกอบทุกชิ้น บริการจัดสเปคคอมพิวเตอร์
          <br />
          ตามการใช้งานในงบประมาณที่ลูกค้าเลือกได้เอง
        </p>
      </div>

      <div className="footer-column footer-links">
        <h4>เกี่ยวกับเรา</h4>
        <p>ติดต่อเรา</p>
        <p>เกี่ยวกับเรา</p>
        <p>ข้อกำหนดและเงื่อนไข</p>
        <p>นโยบายความเป็นส่วนตัว</p>
      </div>

      <div className="footer-column footer-contact">
        <h4>ติดต่อเรา</h4>
        <p><strong>เบอร์โทรศัพท์ :</strong> xxx-xxx-xxxx</p>
        <p><strong>อีเมล :</strong> xxxxxxxx@ilovecpu.com</p>
      </div>
    </footer>
  );
}