import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import api from '../../api';

export default function ServiceQR() {
  const { qrCodeId } = useParams();
  const navigate = useNavigate();
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getServices()
      .then(r => {
        const s = r.data.find(x => x.qrCodeId === qrCodeId);
        if (s) setService(s);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [qrCodeId]);

  if (loading) return <div className="qr-fullpage"><div className="empty-icon">⏳</div></div>;
  if (!service) return <div className="qr-fullpage"><h3>Service not found</h3><button className="btn btn-ghost" onClick={() => navigate(-1)}>Back</button></div>;

  // The QR code encodes a deep link or internal identifier that the iOS app understands
  const qrValue = `pulsepay://service/${service.qrCodeId}`;

  return (
    <div className="qr-fullpage animate-in">
      <div>
        <h2>{service.name}</h2>
        <p className="qr-info">Scan with the PulsePay iOS app to start session</p>
      </div>

      <div className="qr-wrapper">
        <QRCodeSVG 
          value={qrValue} 
          size={300} 
          bgColor={"#ffffff"} 
          fgColor={"#000000"} 
          level={"H"} 
          includeMargin={false} 
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
        <div className="qr-id">{service.qrCodeId}</div>
        <div style={{ fontSize: 18, fontWeight: 600 }}>₹{service.ratePerMinute.toFixed(2)} / minute</div>
      </div>

      <div style={{ display: 'flex', gap: 16, marginTop: 24 }} className="no-print">
        <button className="btn btn-ghost" onClick={() => navigate(-1)}>← Back</button>
        <button className="btn btn-primary" onClick={() => window.print()}>🖨️ Print QR Code</button>
      </div>
    </div>
  );
}
