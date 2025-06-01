import { ButtonStyle } from 'discord.js';

export type ButtonOption = {
  id: string;
  label: string;
  style: ButtonStyle;
  callback: (page: number) => number;
};
