import { canvasToPersistentImageUrl } from "../images/persistentImage";

const CARD = {
  width: 1511,
  height: 2080,
  level: { x: 70, y: 72, width: 155, height: 155, fontSize: 92 },
  stress: { x: 1285, y: 72, width: 155, height: 155, fontSize: 78 },
  panel: {
    x: 126,
    yMaxTop: 755,
    yBottom: 1968,
    width: 1258,
    radius: 22,
    paddingX: 52,
    paddingTop: 28,
    paddingBottom: 36,
    titleBottom: 28
  },
  title: { fontSize: 72, minFontSize: 44, lineHeight: 1.06 },
  body: { fontSize: 54, minFontSize: 30, lineHeight: 1.22 }
};

export interface SpellCardInput {
  templateImageUrl: string;
  name: string;
  text: string;
  level: number;
  stress: number;
}

export async function renderSpellCard(input: SpellCardInput) {
  const canvas = document.createElement("canvas");
  canvas.width = CARD.width;
  canvas.height = CARD.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas nicht verfuegbar.");

  const background = await loadImage(input.templateImageUrl);
  context.drawImage(background, 0, 0, CARD.width, CARD.height);

  drawLevel(context, input.level);
  drawStress(context, input.stress);
  drawTextPanel(context, input.name, input.text);

  return canvasToPersistentImageUrl(canvas, "webp", 0.9);
}

function drawLevel(context: CanvasRenderingContext2D, level: number) {
  drawCenteredText(context, String(level), CARD.level, CARD.level.fontSize, "800");
}

function drawStress(context: CanvasRenderingContext2D, stress: number) {
  const centerY = CARD.stress.y + CARD.stress.height / 2 + 5;
  context.save();
  context.fillStyle = "white";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = `800 ${CARD.stress.fontSize}px Arial, sans-serif`;
  context.fillText(String(stress), CARD.stress.x + 58, centerY);
  drawLightning(context, CARD.stress.x + 100, CARD.stress.y + 28, 54, 92);
  context.restore();
}

function drawLightning(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) {
  context.save();
  context.fillStyle = "white";
  context.beginPath();
  context.moveTo(x + width * 0.72, y);
  context.lineTo(x + width * 0.24, y + height * 0.52);
  context.lineTo(x + width * 0.52, y + height * 0.52);
  context.lineTo(x + width * 0.22, y + height);
  context.lineTo(x + width * 0.86, y + height * 0.38);
  context.lineTo(x + width * 0.55, y + height * 0.38);
  context.closePath();
  context.fill();
  context.restore();
}

function drawTextPanel(context: CanvasRenderingContext2D, name: string, text: string) {
  const innerWidth = CARD.panel.width - CARD.panel.paddingX * 2;
  let titleSize = CARD.title.fontSize;
  let bodySize = CARD.body.fontSize;
  let titleLines: string[] = [];
  let bodyLines: string[] = [];
  let measuredHeight = 0;
  const maxHeight = CARD.panel.yBottom - CARD.panel.yMaxTop;

  while (bodySize >= CARD.body.minFontSize) {
    titleLines = wrapText(context, name, innerWidth, titleSize, "800");
    bodyLines = wrapText(context, text, innerWidth, bodySize, "400");
    measuredHeight = CARD.panel.paddingTop
      + titleLines.length * titleSize * CARD.title.lineHeight
      + CARD.panel.titleBottom
      + bodyLines.length * bodySize * CARD.body.lineHeight
      + CARD.panel.paddingBottom;
    if (measuredHeight <= maxHeight) break;
    if (titleSize > CARD.title.minFontSize) titleSize -= 4;
    bodySize -= 2;
  }

  const panelHeight = Math.min(maxHeight, measuredHeight);
  const panelY = CARD.panel.yBottom - panelHeight;
  roundedRect(context, CARD.panel.x, panelY, CARD.panel.width, panelHeight, CARD.panel.radius, "rgba(255,255,255,0.78)");

  context.save();
  context.fillStyle = "#050505";
  context.textAlign = "center";
  context.textBaseline = "top";

  let y = panelY + CARD.panel.paddingTop;
  context.font = `800 ${titleSize}px Arial, sans-serif`;
  titleLines.forEach((line) => {
    context.fillText(line, CARD.panel.x + CARD.panel.width / 2, y);
    y += titleSize * CARD.title.lineHeight;
  });

  y += CARD.panel.titleBottom;
  context.font = `400 ${bodySize}px Arial, sans-serif`;
  bodyLines.forEach((line) => {
    context.fillText(line, CARD.panel.x + CARD.panel.width / 2, y);
    y += bodySize * CARD.body.lineHeight;
  });
  context.restore();
}

function drawCenteredText(context: CanvasRenderingContext2D, text: string, box: { x: number; y: number; width: number; height: number }, fontSize: number, weight: string) {
  context.save();
  context.fillStyle = "white";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = `${weight} ${fontSize}px Arial, sans-serif`;
  context.fillText(text, box.x + box.width / 2, box.y + box.height / 2 + 5);
  context.restore();
}

function wrapText(context: CanvasRenderingContext2D, text: string, maxWidth: number, fontSize: number, weight: string) {
  context.font = `${weight} ${fontSize}px Arial, sans-serif`;
  return String(text || "")
    .split(/\n+/)
    .flatMap((paragraph) => wrapParagraph(context, paragraph.trim(), maxWidth));
}

function wrapParagraph(context: CanvasRenderingContext2D, paragraph: string, maxWidth: number) {
  if (!paragraph) return [""];
  const words = paragraph.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  words.forEach((word) => {
    const test = line ? `${line} ${word}` : word;
    if (context.measureText(test).width <= maxWidth || !line) {
      line = test;
      return;
    }
    lines.push(line);
    line = word;
  });
  if (line) lines.push(line);
  return lines;
}

function roundedRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number, fillStyle: string) {
  context.save();
  context.fillStyle = fillStyle;
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
  context.fill();
  context.restore();
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Template konnte nicht geladen werden."));
    image.src = src;
  });
}
