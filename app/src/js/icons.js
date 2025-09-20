// Loads application icons as raw SVG strings. Usage: mountIcon(el, 'home')
import arrowLeftIcon from '@/icons/arrow-left.svg?raw';
import checkIcon from '@/icons/check.svg?raw';
import chevronLeftIcon from '@/icons/chevron-left.svg?raw';
import chevronRightIcon from '@/icons/chevron-right.svg?raw';
import crownIcon from '@/icons/crown.svg?raw';
import databaseIcon from '@/icons/database.svg?raw';
import dollarSignIcon from '@/icons/dollar-sign.svg?raw';
import homeFilledIcon from '@/icons/home-filled.svg?raw';
import homeIcon from '@/icons/home.svg?raw';
import menuFilledIcon from '@/icons/menu-filled.svg?raw';
import menuIcon from '@/icons/menu.svg?raw';
import monitorIcon from '@/icons/monitor.svg?raw';
import plusCircleIcon from '@/icons/plus-circle.svg?raw';
import plusIcon from '@/icons/plus.svg?raw';
import profileIcon from '@/icons/profile.svg?raw';
import settingsIcon from '@/icons/settings.svg?raw';
import shiftsFilledIcon from '@/icons/shifts-filled.svg?raw';
import shiftsIcon from '@/icons/shifts.svg?raw';
import subsFilledIcon from '@/icons/subs-filled.svg?raw';
import subsIcon from '@/icons/subs.svg?raw';
import userIcon from '@/icons/user.svg?raw';
import xIcon from '@/icons/x.svg?raw';

const ICONS = {
  'arrow-left': arrowLeftIcon,
  check: checkIcon,
  'chevron-left': chevronLeftIcon,
  'chevron-right': chevronRightIcon,
  crown: crownIcon,
  database: databaseIcon,
  'dollar-sign': dollarSignIcon,
  'home-filled': homeFilledIcon,
  home: homeIcon,
  'menu-filled': menuFilledIcon,
  menu: menuIcon,
  monitor: monitorIcon,
  'plus-circle': plusCircleIcon,
  plus: plusIcon,
  profile: profileIcon,
  settings: settingsIcon,
  'shifts-filled': shiftsFilledIcon,
  shifts: shiftsIcon,
  'subs-filled': subsFilledIcon,
  subs: subsIcon,
  user: userIcon,
  x: xIcon
};

export function mountIcon(el, name) {
  const svg = ICONS[name];
  if (svg) {
    el.innerHTML = svg;
  }
}

export function mountAll(root = document) {
  root.querySelectorAll('[data-icon]').forEach(el => mountIcon(el, el.dataset.icon));
}
