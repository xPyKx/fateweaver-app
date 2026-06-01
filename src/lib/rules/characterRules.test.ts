import { describe, expect, it } from "vitest";
import {
  difficulty,
  dieForLevel,
  dodge,
  earnedExperienceSlots,
  hitPoints,
  lightDamageThreshold,
  stress,
  tierForLevel
} from "./characterRules";

const attributes = {
  kraft: -1,
  agilitaet: 2,
  konstitution: -2,
  intelligenz: 1,
  willenskraft: 3,
  charisma: 0,
  wahrnehmung: 0,
  geschick: 1
};

describe("character rules", () => {
  it("derives tier and dice from level", () => {
    expect(tierForLevel(1)).toBe(1);
    expect(tierForLevel(2)).toBe(2);
    expect(tierForLevel(8)).toBe(2);
    expect(tierForLevel(9)).toBe(3);
    expect(tierForLevel(14)).toBe(3);
    expect(tierForLevel(15)).toBe(4);
    expect(dieForLevel(1)).toBe("W6");
    expect(dieForLevel(2)).toBe("W8");
    expect(dieForLevel(9)).toBe("W10");
    expect(dieForLevel(15)).toBe("W12");
  });

  it("accepts negative attributes in derived values", () => {
    expect(hitPoints(attributes, 0)).toBe(3);
    expect(stress(attributes, 1)).toBe(9);
    expect(dodge(attributes, [{ id: "b", label: "Bonus", value: -1, description: "" }])).toBe(11);
    expect(lightDamageThreshold(attributes, 5, { armorValue: 1, dodgeBonus: 0, baseThresholdLight: 4 })).toBe(6);
  });

  it("uses the higher mental attribute for difficulty", () => {
    expect(difficulty(attributes, 1)).toBe(14);
  });

  it("adds experience slots at configured gates", () => {
    expect(earnedExperienceSlots(1)).toBe(2);
    expect(earnedExperienceSlots(2)).toBe(3);
    expect(earnedExperienceSlots(18)).toBe(8);
  });
});
