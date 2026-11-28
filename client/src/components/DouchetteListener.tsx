import { useNavigate } from 'react-router-dom';
import { useHidScanner } from '../lib/hidScanner';

/**
 * USB / wireless douchette: a scan from any screen (cursor not in a text field) opens the scanner page
 * with that code → product sheet (Marquer comme vendu…) or the déposant's suivi for a contract QR.
 */
export default function DouchetteListener() {
  const navigate = useNavigate();
  useHidScanner((code) => {
    navigate(`/scan?code=${encodeURIComponent(code)}&t=${Date.now()}`);
  });
  return null;
}
