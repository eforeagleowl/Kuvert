import qrcode from "../vendor/qrcode.js";
import { s } from "../ui/dom.js";
export function qrSVG(text, label) {
  const qr = qrcode(0, "M");
  qr.addData(text);
  qr.make();
  const count = qr.getModuleCount(), quiet = 4;
  let path = "";
  for (let y = 0; y < count; y++) for (let x = 0; x < count; x++) if (qr.isDark(y, x)) path += `M${x+quiet} ${y+quiet}h1v1h-1z`;
  return s("svg", { viewBox: `0 0 ${count+8} ${count+8}`, role: "img", "aria-label": label, class: "invite-qr", "shape-rendering": "crispEdges" },
    s("rect", {width:count+8,height:count+8,fill:"#fff"}), s("path", {d:path,fill:"#17263a"}));
}
