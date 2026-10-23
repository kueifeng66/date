/**
 * iOS 3D Cylinder Drum Date Picker Wheel & Age Calculator
 * Aligned with iosYearWheel.ios-picker-wheel and iosMonthWheel.ios-picker-wheel mechanics
 * Traditional Chinese (繁體中文) & English Bilingual Support
 */

(function () {
  'use strict';

  // Math utilities
  const rad = Math.PI / 180;
  const clamp = (val, min, max) => Math.max(min, Math.min(max, val));
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

  /**
   * Helper: Get number of days in a given year and month (month is 1-12)
   */
  function getDaysInMonth(year, month) {
    return new Date(year, month, 0).getDate();
  }

  /**
   * Helper: Check if a year is a leap year
   */
  function isLeapYear(year) {
    return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
  }

  /**
   * Helper: Get Chinese Zodiac animal by year (Traditional Chinese)
   */
  function getChineseZodiac(year, lang = 'zh') {
    const animalsZh = ['鼠', '牛', '虎', '兔', '龍', '蛇', '馬', '羊', '猴', '雞', '狗', '豬'];
    const animalsEn = ['Rat', 'Ox', 'Tiger', 'Rabbit', 'Dragon', 'Snake', 'Horse', 'Goat', 'Monkey', 'Rooster', 'Dog', 'Pig'];
    const idx = ((year - 4) % 12 + 12) % 12;
    return lang === 'zh' ? `${animalsZh[idx]}年` : animalsEn[idx];
  }

  /**
   * Helper: Get Western Zodiac sign (Traditional Chinese)
   */
  function getWesternZodiac(month, day, lang = 'zh') {
    const signs = [
      { nameZh: '摩羯座 ♑', nameEn: 'Capricorn ♑', endM: 1, endD: 19 },
      { nameZh: '水瓶座 ♒', nameEn: 'Aquarius ♒', endM: 2, endD: 18 },
      { nameZh: '雙魚座 ♓', nameEn: 'Pisces ♓', endM: 3, endD: 20 },
      { nameZh: '白羊座 ♈', nameEn: 'Aries ♈', endM: 4, endD: 19 },
      { nameZh: '金牛座 ♉', nameEn: 'Taurus ♉', endM: 5, endD: 20 },
      { nameZh: '雙子座 ♊', nameEn: 'Gemini ♊', endM: 6, endD: 21 },
      { nameZh: '巨蟹座 ♋', nameEn: 'Cancer ♋', endM: 7, endD: 22 },
      { nameZh: '獅子座 ♌', nameEn: 'Leo ♌', endM: 8, endD: 22 },
      { nameZh: '處女座 ♍', nameEn: 'Virgo ♍', endM: 9, endD: 22 },
      { nameZh: '天秤座 ♎', nameEn: 'Libra ♎', endM: 10, endD: 23 },
      { nameZh: '天蠍座 ♏', nameEn: 'Scorpio ♏', endM: 11, endD: 22 },
      { nameZh: '射手座 ♐', nameEn: 'Sagittarius ♐', endM: 12, endD: 21 },
      { nameZh: '摩羯座 ♑', nameEn: 'Capricorn ♑', endM: 12, endD: 31 }
    ];

    for (const sign of signs) {
      if (month < sign.endM || (month === sign.endM && day <= sign.endD)) {
        return lang === 'zh' ? sign.nameZh : sign.nameEn;
      }
    }
    return lang === 'zh' ? '摩羯座 ♑' : 'Capricorn ♑';
  }

  /**
   * Helper: Format weekday (Traditional Chinese)
   */
  function getWeekdayName(year, month, day, lang = 'zh') {
    const d = new Date(year, month - 1, day);
    const dayIdx = d.getDay();
    const daysZh = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    const daysEn = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return lang === 'zh' ? `📅 ${daysZh[dayIdx]}` : `📅 ${daysEn[dayIdx]}`;
  }

  /**
   * Audio Synthesizer & Haptic Vibration Manager
   * Produces crisp mechanical drum / ratchet gear clicks using Web Audio API (0 dependencies)
   * and triggers tactile micro-vibration via navigator.vibrate
   */
  class SoundAndHapticManager {
    constructor() {
      this.soundEnabled = localStorage.getItem('date_calc_sound') !== 'false';
      this.vibrateEnabled = true;
      this.audioCtx = null;
      this.lastTickTime = 0;
      this.unlocked = false;

      // Realistic mechanical drum pitch tuning per column type
      this.pitchMap = {
        year: { startFreq: 950, endFreq: 160, duration: 0.022, gain: 0.28 },
        month: { startFreq: 1250, endFreq: 210, duration: 0.019, gain: 0.25 },
        day: { startFreq: 1450, endFreq: 250, duration: 0.017, gain: 0.22 }
      };

      this.setupAutoUnlock();
    }

    setupAutoUnlock() {
      if (typeof window === 'undefined' || !window.addEventListener) return;
      const unlockHandler = () => {
        this.unlockAudio();
        if (window.removeEventListener) {
          window.removeEventListener('pointerdown', unlockHandler);
          window.removeEventListener('keydown', unlockHandler);
          window.removeEventListener('wheel', unlockHandler);
        }
      };
      window.addEventListener('pointerdown', unlockHandler, { passive: true });
      window.addEventListener('keydown', unlockHandler, { passive: true });
      window.addEventListener('wheel', unlockHandler, { passive: true });
    }

    unlockAudio() {
      if (typeof window === 'undefined') return;
      if (!this.audioCtx) {
        const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
        if (AudioCtxClass) {
          try {
            this.audioCtx = new AudioCtxClass();
          } catch (e) {}
        }
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        try {
          this.audioCtx.resume();
        } catch (e) {}
      }
      this.unlocked = true;
    }

    playTick(type = 'year') {
      if (!this.soundEnabled || typeof window === 'undefined') return;
      this.unlockAudio();
      if (!this.audioCtx) return;

      const now = this.audioCtx.currentTime;
      // Rate limit to prevent audio clipping during ultra-fast momentum fling (max ~55 clicks/sec)
      if (now - this.lastTickTime < 0.018) return;
      this.lastTickTime = now;

      const config = this.pitchMap[type] || this.pitchMap.year;

      try {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(config.startFreq, now);
        osc.frequency.exponentialRampToValueAtTime(config.endFreq, now + config.duration * 0.9);

        // Fast exponential decay envelope
        gain.gain.setValueAtTime(config.gain, now);
        gain.gain.exponentialRampToValueAtTime(0.0005, now + config.duration);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start(now);
        osc.stop(now + config.duration + 0.005);
      } catch (err) {}
    }

    triggerVibrate() {
      if (!this.vibrateEnabled || typeof navigator === 'undefined') return;
      if (navigator.vibrate) {
        try {
          navigator.vibrate(6); // 6ms crisp haptic impulse
        } catch (e) {}
      }
    }

    tick(type = 'year') {
      this.playTick(type);
      this.triggerVibrate();
    }

    toggleSound() {
      this.soundEnabled = !this.soundEnabled;
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('date_calc_sound', this.soundEnabled);
      }
      if (this.soundEnabled) {
        this.tick('day');
      }
      return this.soundEnabled;
    }
  }

  /**
   * Single Wheel Column class
   * Implements identical 3D cylinder drum projection, elastic damping, momentum flick,
   * wheel debounce, keyboard navigation, and tap-to-select as in ref/script.js
   */
  class IosWheelColumn {
    constructor(options) {
      this.colEl = options.colEl;
      this.wheelEl = this.colEl.querySelector('.ios-picker-wheel');
      this.type = options.type || 'year';
      this.items = options.items || [];
      this.onChange = options.onChange || (() => {});
      this.parentPicker = options.parentPicker;
      this.soundManager = options.soundManager;

      // Exact geometry parameters matching ref/script.js (based on 2.6rem = 26px)
      this.itemHeight = 26;
      this.cylinderRadius = 48;
      this.angleStep = 26;

      this.currentIndex = 0;
      this.targetIndex = undefined;
      this.floatIndex = 0;
      this.isDragging = false;
      this.startY = 0;
      this.startFloatIndex = 0;
      this.lastY = 0;
      this.lastTime = 0;
      this.velocity = 0;
      this.dragDistance = 0;
      this.animId = null;
      this.wheelDebounceTimer = null;

      this.domItems = [];
      this.renderItems();
      this.bindEvents();
    }

    renderItems() {
      this.wheelEl.innerHTML = '';
      this.domItems = this.items.map((item, idx) => {
        const div = document.createElement('div');
        div.className = 'ios-picker-item';
        div.textContent = item.label;
        div.dataset.index = String(idx);
        this.wheelEl.appendChild(div);
        return div;
      });
    }

    setItems(newItems, targetValue) {
      this.targetIndex = undefined;
      this.items = newItems;
      this.renderItems();

      let targetIdx = 0;
      if (targetValue !== undefined) {
        const found = this.items.findIndex(it => it.value === targetValue);
        targetIdx = found !== -1 ? found : Math.min(this.currentIndex, this.items.length - 1);
      } else {
        targetIdx = Math.min(this.currentIndex, this.items.length - 1);
      }

      this.currentIndex = targetIdx;
      this.floatIndex = targetIdx;
      this.updateVisuals(targetIdx);
    }

    updateVisuals(fIndex) {
      const nearestInt = Math.round(fIndex);
      this.floatIndex = fIndex;

      // Haptic feedback tick and mechanical sound when passing an item
      if (nearestInt !== this.currentIndex && nearestInt >= 0 && nearestInt < this.items.length) {
        this.currentIndex = nearestInt;
        if (this.soundManager) {
          this.soundManager.tick(this.type);
        } else if (typeof navigator !== 'undefined' && navigator.vibrate) {
          try { navigator.vibrate(6); } catch (e) {}
        }
      }

      for (let i = 0; i < this.domItems.length; i++) {
        const delta = i - fIndex;
        const dom = this.domItems[i];
        if (Math.abs(delta) > 2.3) {
          dom.style.display = 'none';
          dom.classList.remove('active');
        } else {
          dom.style.display = 'flex';
          const thetaDeg = delta * this.angleStep;
          const thetaRad = thetaDeg * rad;
          const y = this.cylinderRadius * Math.sin(thetaRad);
          const z = this.cylinderRadius * (Math.cos(thetaRad) - 1);
          const rotX = -thetaDeg;
          const opacity = Math.max(0.12, Math.pow(Math.cos(thetaRad), 2.4));
          const scale = 1 - (1 - Math.cos(thetaRad)) * 0.45;

          dom.style.transform = `translate3d(0, ${y.toFixed(2)}px, ${z.toFixed(2)}px) rotateX(${rotX.toFixed(2)}deg) scale(${scale.toFixed(3)})`;
          dom.style.opacity = opacity.toFixed(3);

          if (Math.abs(delta) < 0.35) {
            dom.classList.add('active');
          } else {
            dom.classList.remove('active');
          }
        }
      }

      const activeItem = this.items[this.currentIndex];
      if (activeItem) {
        this.colEl.setAttribute('aria-valuenow', activeItem.value);
        this.colEl.setAttribute('aria-valuetext', activeItem.label);
      }
    }

    snapTo(targetIdx, duration = 220, notify = true) {
      if (this.animId) cancelAnimationFrame(this.animId);
      targetIdx = clamp(targetIdx, 0, this.items.length - 1);
      this.targetIndex = targetIdx;
      const startF = this.floatIndex;
      const change = targetIdx - startF;
      const startTime = performance.now();

      const step = (now) => {
        const elapsed = now - startTime;
        const t = Math.min(1, elapsed / duration);
        const currentF = startF + change * easeOutCubic(t);
        this.updateVisuals(currentF);

        if (t < 1) {
          this.animId = requestAnimationFrame(step);
        } else {
          this.updateVisuals(targetIdx);
          this.floatIndex = targetIdx;
          this.currentIndex = targetIdx;
          this.targetIndex = undefined;
          if (notify) {
            this.onChange(this.getValue());
          }
        }
      };

      this.animId = requestAnimationFrame(step);
    }

    bindEvents() {
      const colEl = this.colEl;

      const onPointerDown = (e) => {
        if (this.animId) cancelAnimationFrame(this.animId);
        if (this.soundManager) this.soundManager.unlockAudio();
        this.targetIndex = undefined;
        this.isDragging = true;
        const clientY = e.clientY ?? (e.touches && e.touches[0].clientY) ?? 0;
        this.startY = clientY;
        this.startFloatIndex = this.floatIndex;
        this.lastY = clientY;
        this.lastTime = performance.now();
        this.velocity = 0;
        this.dragDistance = 0;

        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
        window.addEventListener('pointercancel', onPointerUp);

        if (e.pointerId && colEl.setPointerCapture) {
          try { colEl.setPointerCapture(e.pointerId); } catch (err) {}
        }
      };

      const onPointerMove = (e) => {
        if (!this.isDragging) return;
        const clientY = e.clientY ?? (e.touches && e.touches[0].clientY) ?? 0;
        const deltaY = clientY - this.startY;
        this.dragDistance += Math.abs(clientY - this.lastY);

        const deltaIndex = -deltaY / this.itemHeight;
        let candidate = this.startFloatIndex + deltaIndex;
        const min = 0;
        const max = this.items.length - 1;

        // Elastic rubber-band resistance beyond bounds
        if (candidate < min) {
          candidate = min + (candidate - min) * 0.25;
        } else if (candidate > max) {
          candidate = max + (candidate - max) * 0.25;
        }

        const now = performance.now();
        const dt = now - this.lastTime;
        if (dt > 10) {
          this.velocity = (-(clientY - this.lastY) / this.itemHeight) / (dt / 16.67);
          this.lastY = clientY;
          this.lastTime = now;
        }

        this.updateVisuals(candidate);
      };

      const onPointerUp = (e) => {
        if (!this.isDragging) return;
        this.isDragging = false;

        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        window.removeEventListener('pointercancel', onPointerUp);

        const min = 0;
        const max = this.items.length - 1;

        // Tap detection
        if (this.dragDistance < 5) {
          const itemEl = e.target.closest('.ios-picker-item');
          if (itemEl && itemEl.dataset.index !== undefined) {
            const clickedIdx = parseInt(itemEl.dataset.index, 10);
            this.snapTo(clickedIdx, 220, true);
            return;
          }
        }

        // Boundary return
        if (this.floatIndex < min) {
          this.snapTo(min, 200, true);
          return;
        }
        if (this.floatIndex > max) {
          this.snapTo(max, 200, true);
          return;
        }

        // Momentum flick
        if (Math.abs(this.velocity) > 0.08) {
          let currentF = this.floatIndex;
          let v = this.velocity;
          const decay = 0.92;

          const momentumStep = () => {
            v *= decay;
            currentF += v;

            if (currentF < min - 0.5 || currentF > max + 0.5 || Math.abs(v) < 0.02) {
              this.snapTo(Math.round(clamp(currentF, min, max)), 200, true);
            } else {
              this.updateVisuals(currentF);
              this.animId = requestAnimationFrame(momentumStep);
            }
          };

          this.animId = requestAnimationFrame(momentumStep);
        } else {
          const target = Math.round(clamp(this.floatIndex, min, max));
          this.snapTo(target, 180, true);
        }
      };

      colEl.addEventListener('pointerdown', onPointerDown);

      // Mouse wheel scrolling with debounced snap
      colEl.addEventListener('wheel', (e) => {
        e.preventDefault();
        if (this.soundManager) this.soundManager.unlockAudio();
        if (this.animId) cancelAnimationFrame(this.animId);
        const deltaIndex = (e.deltaY / this.itemHeight) * 0.6;
        let candidate = clamp(this.floatIndex + deltaIndex, 0, this.items.length - 1);
        this.updateVisuals(candidate);

        clearTimeout(this.wheelDebounceTimer);
        this.wheelDebounceTimer = setTimeout(() => {
          this.snapTo(Math.round(this.floatIndex), 160, true);
        }, 100);
      }, { passive: false });

      // Keyboard navigation
      colEl.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          this.snapTo(this.currentIndex - 1, 150, true);
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          this.snapTo(this.currentIndex + 1, 150, true);
        } else if (e.key === 'PageUp') {
          e.preventDefault();
          this.snapTo(this.currentIndex - 5, 200, true);
        } else if (e.key === 'PageDown') {
          e.preventDefault();
          this.snapTo(this.currentIndex + 5, 200, true);
        } else if (e.key === 'Home') {
          e.preventDefault();
          this.snapTo(0, 220, true);
        } else if (e.key === 'End') {
          e.preventDefault();
          this.snapTo(this.items.length - 1, 220, true);
        }
      });
    }

    getValue() {
      const idx = this.targetIndex !== undefined ? this.targetIndex : this.currentIndex;
      return this.items[idx]?.value;
    }

    setValue(val, animate = true) {
      const idx = this.items.findIndex(item => item.value === val);
      if (idx !== -1) {
        if (animate && Math.abs(this.currentIndex - idx) <= 8) {
          this.snapTo(idx, 240, true);
        } else {
          if (this.animId) cancelAnimationFrame(this.animId);
          this.currentIndex = idx;
          this.floatIndex = idx;
          this.updateVisuals(idx);
          this.onChange(this.getValue());
        }
      }
    }

    step(direction) {
      const target = this.currentIndex + direction;
      if (target >= 0 && target < this.items.length) {
        this.snapTo(target, 160, true);
      }
    }
  }

  /**
   * Complete 3-Column iOS Date Picker (Year, Month, Day)
   * Coordinates day-count dynamic resizing when Year or Month rotates
   */
  class IosDatePicker {
    constructor(options) {
      this.container = options.container;
      this.yearColEl = options.yearColEl;
      this.monthColEl = options.monthColEl;
      this.dayColEl = options.dayColEl;
      this.minYear = options.minYear || 1900;
      this.maxYear = options.maxYear || 2100;
      this.onChange = options.onChange || (() => {});
      this.lang = options.lang || 'zh';
      this.soundManager = options.soundManager;

      // Build data lists
      this.yearList = [];
      for (let y = this.minYear; y <= this.maxYear; y++) {
        this.yearList.push({ value: y, label: this.lang === 'zh' ? `${y}年` : `${y}` });
      }

      this.monthList = [];
      for (let m = 1; m <= 12; m++) {
        const mStr = String(m).padStart(2, '0');
        this.monthList.push({ value: m, label: this.lang === 'zh' ? `${mStr}月` : `${mStr}` });
      }

      // Initialize columns
      this.yearWheel = new IosWheelColumn({
        colEl: this.yearColEl,
        type: 'year',
        items: this.yearList,
        parentPicker: this,
        soundManager: this.soundManager,
        onChange: () => this.handleYearOrMonthChange()
      });

      this.monthWheel = new IosWheelColumn({
        colEl: this.monthColEl,
        type: 'month',
        items: this.monthList,
        parentPicker: this,
        soundManager: this.soundManager,
        onChange: () => this.handleYearOrMonthChange()
      });

      // Initial day list
      const initialYear = options.initialYear || 2000;
      const initialMonth = options.initialMonth || 1;
      const initialDay = options.initialDay || 1;
      const daysCount = getDaysInMonth(initialYear, initialMonth);

      this.dayList = this.buildDayList(daysCount);

      this.dayWheel = new IosWheelColumn({
        colEl: this.dayColEl,
        type: 'day',
        items: this.dayList,
        parentPicker: this,
        soundManager: this.soundManager,
        onChange: () => this.notifyChange()
      });

      this.setDate(initialYear, initialMonth, initialDay, false);
    }

    buildDayList(daysCount) {
      const list = [];
      for (let d = 1; d <= daysCount; d++) {
        const dStr = String(d).padStart(2, '0');
        list.push({ value: d, label: this.lang === 'zh' ? `${dStr}日` : `${dStr}` });
      }
      return list;
    }

    handleYearOrMonthChange() {
      const y = this.yearWheel.getValue();
      const m = this.monthWheel.getValue();
      const curDayVal = this.dayWheel.getValue();
      const daysCount = getDaysInMonth(y, m);

      if (daysCount !== this.dayList.length) {
        this.dayList = this.buildDayList(daysCount);
        const clampedDay = Math.min(curDayVal, daysCount);
        this.dayWheel.setItems(this.dayList, clampedDay);
      }
      this.notifyChange();
    }

    notifyChange() {
      const y = this.yearWheel.getValue();
      const m = this.monthWheel.getValue();
      const d = this.dayWheel.getValue();
      this.onChange({ year: y, month: m, day: d });
    }

    getDate() {
      return {
        year: this.yearWheel.getValue(),
        month: this.monthWheel.getValue(),
        day: this.dayWheel.getValue()
      };
    }

    setDate(year, month, day, animate = true) {
      const yIdx = this.yearList.findIndex(item => item.value === year);
      const mIdx = this.monthList.findIndex(item => item.value === month);
      const daysCount = getDaysInMonth(year, month);

      if (daysCount !== this.dayList.length) {
        this.dayList = this.buildDayList(daysCount);
        const clampedDay = Math.min(day, daysCount);
        this.dayWheel.setItems(this.dayList, clampedDay);
      } else {
        const dIdx = this.dayList.findIndex(item => item.value === day);
        if (dIdx !== -1) {
          if (animate && Math.abs(this.dayWheel.currentIndex - dIdx) <= 8) {
            this.dayWheel.snapTo(dIdx, 240, false);
          } else {
            if (this.dayWheel.animId) cancelAnimationFrame(this.dayWheel.animId);
            this.dayWheel.currentIndex = dIdx;
            this.dayWheel.floatIndex = dIdx;
            this.dayWheel.updateVisuals(dIdx);
          }
        }
      }

      if (yIdx !== -1) {
        if (animate && Math.abs(this.yearWheel.currentIndex - yIdx) <= 8) {
          this.yearWheel.snapTo(yIdx, 240, false);
        } else {
          if (this.yearWheel.animId) cancelAnimationFrame(this.yearWheel.animId);
          this.yearWheel.currentIndex = yIdx;
          this.yearWheel.floatIndex = yIdx;
          this.yearWheel.updateVisuals(yIdx);
        }
      }

      if (mIdx !== -1) {
        if (animate && Math.abs(this.monthWheel.currentIndex - mIdx) <= 8) {
          this.monthWheel.snapTo(mIdx, 240, false);
        } else {
          if (this.monthWheel.animId) cancelAnimationFrame(this.monthWheel.animId);
          this.monthWheel.currentIndex = mIdx;
          this.monthWheel.floatIndex = mIdx;
          this.monthWheel.updateVisuals(mIdx);
        }
      }

      const actualDay = Math.min(day, daysCount);
      this.onChange({ year, month, day: actualDay });
    }

    setLanguage(lang) {
      this.lang = lang;
      const curDate = this.getDate();

      this.yearList = [];
      for (let y = this.minYear; y <= this.maxYear; y++) {
        this.yearList.push({ value: y, label: lang === 'zh' ? `${y}年` : `${y}` });
      }

      this.monthList = [];
      for (let m = 1; m <= 12; m++) {
        const mStr = String(m).padStart(2, '0');
        this.monthList.push({ value: m, label: lang === 'zh' ? `${mStr}月` : `${mStr}` });
      }

      const daysCount = getDaysInMonth(curDate.year, curDate.month);
      this.dayList = this.buildDayList(daysCount);

      this.yearWheel.setItems(this.yearList, curDate.year);
      this.monthWheel.setItems(this.monthList, curDate.month);
      this.dayWheel.setItems(this.dayList, curDate.day);
    }
  }

  /**
   * Calendar Date Difference Calculation Engine
   * Strictly calculates calendar age in years, months, and days via forward-stepping,
   * avoiding month-borrowing anomalies (e.g., Feb 28/29 transitions).
   */
  class DateDifferenceCalculator {
    static compareDates(a, b) {
      if (a.year !== b.year) return a.year - b.year;
      if (a.month !== b.month) return a.month - b.month;
      return a.day - b.day;
    }

    static addYears(date, years) {
      const targetYear = date.year + years;
      const maxDays = getDaysInMonth(targetYear, date.month);
      return { year: targetYear, month: date.month, day: Math.min(date.day, maxDays) };
    }

    static addMonths(date, months) {
      let targetMonth = date.month + months;
      let targetYear = date.year;
      while (targetMonth > 12) {
        targetMonth -= 12;
        targetYear += 1;
      }
      while (targetMonth < 1) {
        targetMonth += 12;
        targetYear -= 1;
      }
      const maxDays = getDaysInMonth(targetYear, targetMonth);
      return { year: targetYear, month: targetMonth, day: Math.min(date.day, maxDays) };
    }

    /**
     * Compute full difference breakdown
     */
    static calculate(startDate, endDate) {
      const cmp = this.compareDates(startDate, endDate);
      const isNegative = cmp > 0;
      const [start, end] = isNegative ? [endDate, startDate] : [startDate, endDate];

      // 1. Calculate whole calendar years
      let years = end.year - start.year;
      let cur = this.addYears(start, years);
      if (this.compareDates(cur, end) > 0) {
        years--;
        cur = this.addYears(start, years);
      }

      // 2. Calculate whole calendar months
      let months = 0;
      while (true) {
        const nextCur = this.addMonths(cur, 1);
        if (this.compareDates(nextCur, end) <= 0) {
          months++;
          cur = nextCur;
        } else {
          break;
        }
      }

      // 3. Remaining days
      const dCur = new Date(cur.year, cur.month - 1, cur.day);
      const dEnd = new Date(end.year, end.month - 1, end.day);
      const msDiff = dEnd - dCur;
      const days = Math.round(msDiff / (1000 * 60 * 60 * 24));

      // 4. Total absolute days between start and end
      const dStart = new Date(start.year, start.month - 1, start.day);
      const totalDays = Math.round((dEnd - dStart) / (1000 * 60 * 60 * 24));

      // 5. Units conversion
      const totalWeeks = Math.floor(totalDays / 7);
      const remDaysInWeek = totalDays % 7;
      const totalMonthsApprox = years * 12 + months;
      const totalHours = totalDays * 24;
      const totalMinutes = totalHours * 60;
      const totalSeconds = totalMinutes * 60;

      // 6. Working days (approximating 5-day work week)
      let workdays = 0;
      const tempDate = new Date(dStart);
      while (tempDate < dEnd) {
        const dayOfWeek = tempDate.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          workdays++;
        }
        tempDate.setDate(tempDate.getDate() + 1);
      }

      return {
        isNegative,
        years,
        months,
        days,
        totalDays,
        totalWeeks,
        remDaysInWeek,
        totalMonthsApprox,
        totalHours,
        totalMinutes,
        totalSeconds,
        workdays,
        start,
        end
      };
    }
  }

  /**
   * Main Application Controller
   */
  class AppController {
    constructor() {
      this.currentLang = localStorage.getItem('date_calc_lang') || 'zh';
      this.currentTheme = localStorage.getItem('date_calc_theme') || 'theme-wood';
      this.soundManager = new SoundAndHapticManager();

      this.initDOMElements();
      this.initTheme();
      this.initSoundUI();
      this.initPickers();
      this.bindEvents();
      this.updateAll();
    }

    initDOMElements() {
      // Pickers
      this.startWheelPicker = document.getElementById('startWheelPicker');
      this.startYearColumn = document.getElementById('startYearColumn');
      this.startMonthColumn = document.getElementById('startMonthColumn');
      this.startDayColumn = document.getElementById('startDayColumn');

      this.endWheelPicker = document.getElementById('endWheelPicker');
      this.endYearColumn = document.getElementById('endYearColumn');
      this.endMonthColumn = document.getElementById('endMonthColumn');
      this.endDayColumn = document.getElementById('endDayColumn');

      // Date Badges & Meta
      this.startDateBadge = document.getElementById('startDateBadge');
      this.endDateBadge = document.getElementById('endDateBadge');
      this.startWeekdayPill = document.getElementById('startWeekdayPill');
      this.startZodiacPill = document.getElementById('startZodiacPill');
      this.startChineseZodiacPill = document.getElementById('startChineseZodiacPill');
      this.startLeapPill = document.getElementById('startLeapPill');
      this.endWeekdayPill = document.getElementById('endWeekdayPill');
      this.endRelativePill = document.getElementById('endRelativePill');
      this.endLeapPill = document.getElementById('endLeapPill');

      // Results
      this.diffYears = document.getElementById('diffYears');
      this.diffMonths = document.getElementById('diffMonths');
      this.diffDays = document.getElementById('diffDays');
      this.diffSummarySentence = document.getElementById('diffSummarySentence');
      this.negativeNotice = document.getElementById('negativeNotice');

      // Breakdown
      this.totalDaysVal = document.getElementById('totalDaysVal');
      this.totalWeeksVal = document.getElementById('totalWeeksVal');
      this.totalMonthsVal = document.getElementById('totalMonthsVal');
      this.totalHoursVal = document.getElementById('totalHoursVal');
      this.totalMinutesVal = document.getElementById('totalMinutesVal');
      this.totalWorkdaysVal = document.getElementById('totalWorkdaysVal');

      // Milestones
      this.nextBdayCountdown = document.getElementById('nextBdayCountdown');
      this.nextBdayDate = document.getElementById('nextBdayDate');
      this.bdayProgressFill = document.getElementById('bdayProgressFill');
      this.bdayProgressNote = document.getElementById('bdayProgressNote');
      this.tenThousandDate = document.getElementById('tenThousandDate');
      this.tenThousandStatus = document.getElementById('tenThousandStatus');
      this.adultDate = document.getElementById('adultDate');
      this.adultStatus = document.getElementById('adultStatus');

      // Buttons & Controls
      this.themeSelect = document.getElementById('themeSelect');
      this.soundToggleBtn = document.getElementById('soundToggleBtn');
      this.soundIcon = document.getElementById('soundIcon');
      this.soundText = document.getElementById('soundText');
      this.langToggleBtn = document.getElementById('langToggleBtn');
      this.langText = document.getElementById('langText');
      this.swapDatesBtn = document.getElementById('swapDatesBtn');
      this.copyResultBtn = document.getElementById('copyResultBtn');
      this.toastEl = document.getElementById('toast');
    }

    initTheme() {
      document.body.className = this.currentTheme;
      if (this.themeSelect) {
        this.themeSelect.value = this.currentTheme;
      }
    }

    initSoundUI() {
      this.updateSoundButtonUI();
    }

    updateSoundButtonUI(isEnabled = this.soundManager.soundEnabled) {
      if (!this.soundToggleBtn) return;
      const isZh = this.currentLang === 'zh';
      if (this.soundIcon) {
        this.soundIcon.textContent = isEnabled ? '🔊' : '🔇';
      }
      if (this.soundText) {
        this.soundText.textContent = isEnabled
          ? (isZh ? '音效: 開' : 'Sound: ON')
          : (isZh ? '音效: 關' : 'Sound: OFF');
      }
      if (this.soundToggleBtn.classList) {
        this.soundToggleBtn.classList.toggle('muted', !isEnabled);
      }
    }

    initPickers() {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      const currentDay = now.getDate();

      // Start date default: 2000-01-01
      this.startPicker = new IosDatePicker({
        container: this.startWheelPicker,
        yearColEl: this.startYearColumn,
        monthColEl: this.startMonthColumn,
        dayColEl: this.startDayColumn,
        minYear: 1900,
        maxYear: 2100,
        initialYear: 2000,
        initialMonth: 1,
        initialDay: 1,
        lang: this.currentLang,
        soundManager: this.soundManager,
        onChange: () => this.updateAll()
      });

      // End date default: Today
      this.endPicker = new IosDatePicker({
        container: this.endWheelPicker,
        yearColEl: this.endYearColumn,
        monthColEl: this.endMonthColumn,
        dayColEl: this.endDayColumn,
        minYear: 1900,
        maxYear: 2100,
        initialYear: currentYear,
        initialMonth: currentMonth,
        initialDay: currentDay,
        lang: this.currentLang,
        soundManager: this.soundManager,
        onChange: () => this.updateAll()
      });

      // Expose globally for inspectability
      window.startPicker = this.startPicker;
      window.endPicker = this.endPicker;
    }

    bindEvents() {
      // Sound toggle
      if (this.soundToggleBtn) {
        this.soundToggleBtn.addEventListener('click', () => {
          const isEnabled = this.soundManager.toggleSound();
          this.updateSoundButtonUI(isEnabled);
          const isZh = this.currentLang === 'zh';
          this.showToast(isEnabled
            ? (isZh ? '🔊 已開啟滾輪音效與震動' : '🔊 Sound & Vibration Enabled')
            : (isZh ? '🔇 已靜音滾輪音效' : '🔇 Sound Muted'));
        });
      }

      // Theme change
      this.themeSelect.addEventListener('change', (e) => {
        this.currentTheme = e.target.value;
        document.body.className = this.currentTheme;
        localStorage.setItem('date_calc_theme', this.currentTheme);
      });

      // Language toggle
      this.langToggleBtn.addEventListener('click', () => {
        this.currentLang = this.currentLang === 'zh' ? 'en' : 'zh';
        localStorage.setItem('date_calc_lang', this.currentLang);
        this.applyLanguage();
      });

      // Swap dates
      this.swapDatesBtn.addEventListener('click', () => {
        const s = this.startPicker.getDate();
        const e = this.endPicker.getDate();
        this.startPicker.setDate(e.year, e.month, e.day, true);
        this.endPicker.setDate(s.year, s.month, s.day, true);
        this.showToast(this.currentLang === 'zh' ? '已對調起始與結束日期' : 'Start and End dates swapped');
      });

      // Copy result
      this.copyResultBtn.addEventListener('click', () => {
        this.copyResultToClipboard();
      });

      // Stepper button delegates
      document.querySelectorAll('.step-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const group = e.currentTarget.closest('.stepper-group');
          const target = group?.dataset.target;
          const action = e.currentTarget.dataset.action;
          const delta = action === 'prev' ? -1 : 1;

          if (target === 'startYear') this.startPicker.yearWheel.step(delta);
          if (target === 'startMonth') this.startPicker.monthWheel.step(delta);
          if (target === 'startDay') this.startPicker.dayWheel.step(delta);
          if (target === 'endYear') this.endPicker.yearWheel.step(delta);
          if (target === 'endMonth') this.endPicker.monthWheel.step(delta);
          if (target === 'endDay') this.endPicker.dayWheel.step(delta);
        });
      });

      // Start Date Presets
      const now = new Date();
      document.getElementById('startPreset2000')?.addEventListener('click', () => {
        this.startPicker.setDate(2000, 1, 1);
      });
      document.getElementById('startPreset18Y')?.addEventListener('click', () => {
        this.startPicker.setDate(now.getFullYear() - 18, now.getMonth() + 1, now.getDate());
      });
      document.getElementById('startPreset30Y')?.addEventListener('click', () => {
        this.startPicker.setDate(now.getFullYear() - 30, now.getMonth() + 1, now.getDate());
      });
      document.getElementById('startPresetToday')?.addEventListener('click', () => {
        this.startPicker.setDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
      });

      // End Date Presets
      document.getElementById('endPresetToday')?.addEventListener('click', () => {
        this.endPicker.setDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
      });
      document.getElementById('endPresetPlus1Y')?.addEventListener('click', () => {
        const cur = this.endPicker.getDate();
        this.endPicker.setDate(cur.year + 1, cur.month, cur.day);
      });
      document.getElementById('endPresetPlus1M')?.addEventListener('click', () => {
        const cur = this.endPicker.getDate();
        const nextMonth = cur.month === 12 ? 1 : cur.month + 1;
        const nextYear = cur.month === 12 ? cur.year + 1 : cur.year;
        this.endPicker.setDate(nextYear, nextMonth, cur.day);
      });
      document.getElementById('endPresetPlus100D')?.addEventListener('click', () => {
        const cur = this.endPicker.getDate();
        const d = new Date(cur.year, cur.month - 1, cur.day);
        d.setDate(d.getDate() + 100);
        this.endPicker.setDate(d.getFullYear(), d.getMonth() + 1, d.getDate());
      });
    }

    applyLanguage() {
      const isZh = this.currentLang === 'zh';
      this.langText.textContent = isZh ? 'EN' : '繁中';

      // Update static data-i18n elements in Traditional Chinese
      const i18nMap = {
        appTitle: isZh ? '日期差與年齡計算器' : 'Date Difference & Age Calculator',
        appSubtitle: isZh ? '基於 iOS 3D 滾輪選擇器 · 精確計算年、月、天之差' : 'iOS 3D Cylinder Drum Picker · Exact Year, Month, Day Calculator',
        themeLabel: isZh ? '主題樣式' : 'Theme',
        soundOn: isZh ? '音效: 開' : 'Sound: ON',
        soundOff: isZh ? '音效: 關' : 'Sound: OFF',
        startTag: isZh ? '起始' : 'START',
        endTag: isZh ? '結束' : 'END',
        startDateTitle: isZh ? '起始日期 (出生日)' : 'Start Date (Birth Date)',
        endDateTitle: isZh ? '結束日期 (目標日)' : 'End Date (Target Date)',
        preset2000: isZh ? '2000年元旦' : 'Jan 1, 2000',
        preset18Y: isZh ? '18年前' : '18 Yrs Ago',
        preset30Y: isZh ? '30年前' : '30 Yrs Ago',
        presetToday: isZh ? '今天' : 'Today',
        presetEndToday: isZh ? '設為今天' : 'Set to Today',
        presetPlus1Y: isZh ? '+1 年' : '+1 Year',
        presetPlus1M: isZh ? '+1 月' : '+1 Month',
        presetPlus100D: isZh ? '+100 天' : '+100 Days',
        unitYear: isZh ? '年' : 'Y',
        unitMonth: isZh ? '月' : 'M',
        unitDay: isZh ? '日' : 'D',
        swapDates: isZh ? '對調日期' : 'Swap Dates',
        resultTitle: isZh ? '日期差與計算結果 (真實年齡)' : 'Difference & Exact Age Result',
        copyText: isZh ? '複製結果' : 'Copy Result',
        negativeNoticeText: isZh
          ? '結束日期早於起始日期，結果已按倒計方式顯示。您可以點擊上方「對調日期」按鈕調整次序。'
          : 'End date is earlier than start date. You can click "Swap Dates" above to reorder.',
        unitYears: isZh ? '年' : 'Years',
        unitMonths: isZh ? '個月' : 'Months',
        unitDays: isZh ? '天' : 'Days',
        breakdownTitle: isZh ? '多維度時間總計換算' : 'Multi-Unit Time Breakdown',
        labelTotalDays: isZh ? '總天數 (Days)' : 'Total Days',
        labelTotalWeeks: isZh ? '週與天數 (Weeks & Days)' : 'Weeks & Days',
        labelTotalMonths: isZh ? '累計月數 (Months & Days)' : 'Total Months & Days',
        labelTotalHours: isZh ? '總小時數 (Hours)' : 'Total Hours',
        labelTotalMinutes: isZh ? '總分鐘數 (Minutes)' : 'Total Minutes',
        labelTotalWorkdays: isZh ? '工作日約計 (5天制)' : 'Estimated Workdays (5-day)',
        milestoneTitle: isZh ? '年齡與生活里程碑' : 'Age & Life Milestones',
        nextBdayTitle: isZh ? '下一個生日' : 'Next Birthday',
        tenThousandDayTitle: isZh ? '人生的第一萬天' : '10,000th Day of Life',
        legalAdultTitle: isZh ? '18 歲成人禮' : '18th Birthday (Adult)',
        tipsTitle: isZh ? '操作提示與互動指南' : 'Interaction Guide & Tips',
        tip1: isZh
          ? '<strong>3D 滾輪操作：</strong>支援滑鼠滾輪滾動、滑鼠拖曳甩動、觸控手勢上下滑動、以及點擊任意可見項目直接對齊。'
          : '<strong>3D Drum Wheel:</strong> Supports mouse wheel scroll, drag-and-flick, touch swipe, and direct clicking on items to snap.',
        tip2: isZh
          ? '<strong>鍵盤無障礙：</strong>選中滾輪列後，可按上下方向鍵（↑ / ↓）或翻頁鍵（PageUp / PageDown）微調。'
          : '<strong>Keyboard Accessibility:</strong> Focus column and use Up/Down arrows or PageUp/PageDown to cycle items.',
        tip3: isZh
          ? '<strong>動態天數自適應：</strong>選擇不同年份與月份時，日數滾輪將自動在 28 / 29 / 30 / 31 天間平滑約束與切換。'
          : '<strong>Dynamic Day Clamping:</strong> Day wheel automatically adapts between 28, 29, 30, and 31 days based on leap years.',
        tip4: isZh
          ? '<strong>純靜態架構：</strong>本工具為純靜態頁面，無需任何後端伺服器或連網請求，隨時隨地雙擊開啟即用。'
          : '<strong>100% Serverless:</strong> Static webpage running locally without servers or internet connections.'
      };

      document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.dataset.i18n;
        if (i18nMap[key]) {
          el.innerHTML = i18nMap[key];
        }
      });

      this.startPicker.setLanguage(this.currentLang);
      this.endPicker.setLanguage(this.currentLang);
      this.updateSoundButtonUI();
      this.updateAll();
    }

    updateAll() {
      if (!this.startPicker || !this.endPicker) {
        return;
      }

      const s = this.startPicker.getDate();
      const e = this.endPicker.getDate();
      const isZh = this.currentLang === 'zh';

      // 1. Update Card Header Badges
      const sMStr = String(s.month).padStart(2, '0');
      const sDStr = String(s.day).padStart(2, '0');
      const eMStr = String(e.month).padStart(2, '0');
      const eDStr = String(e.day).padStart(2, '0');

      this.startDateBadge.textContent = isZh ? `${s.year}年 ${sMStr}月 ${sDStr}日` : `${s.year}-${sMStr}-${sDStr}`;
      this.endDateBadge.textContent = isZh ? `${e.year}年 ${eMStr}月 ${eDStr}日` : `${e.year}-${eMStr}-${eDStr}`;

      // 2. Update Metadata Pills
      this.startWeekdayPill.textContent = getWeekdayName(s.year, s.month, s.day, this.currentLang);
      this.startZodiacPill.textContent = getWesternZodiac(s.month, s.day, this.currentLang);
      this.startChineseZodiacPill.textContent = getChineseZodiac(s.year, this.currentLang);
      this.startLeapPill.textContent = isLeapYear(s.year) ? (isZh ? '閏年 (366天)' : 'Leap Year (366d)') : (isZh ? '平年 (365天)' : 'Normal Year (365d)');

      this.endWeekdayPill.textContent = getWeekdayName(e.year, e.month, e.day, this.currentLang);

      // Relative to today
      const today = new Date();
      const todayZero = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endZero = new Date(e.year, e.month - 1, e.day);
      const diffTodayDays = Math.round((endZero - todayZero) / (1000 * 60 * 60 * 24));
      if (diffTodayDays === 0) {
        this.endRelativePill.textContent = isZh ? '📍 今天' : '📍 Today';
      } else if (diffTodayDays > 0) {
        this.endRelativePill.textContent = isZh ? `⏳ ${diffTodayDays} 天後` : `⏳ In ${diffTodayDays} days`;
      } else {
        this.endRelativePill.textContent = isZh ? `⏱️ ${Math.abs(diffTodayDays)} 天前` : `⏱️ ${Math.abs(diffTodayDays)} days ago`;
      }
      this.endLeapPill.textContent = isLeapYear(e.year) ? (isZh ? '閏年 (366天)' : 'Leap Year (366d)') : (isZh ? '平年 (365天)' : 'Normal Year (365d)');

      // 3. Calculate Date Difference & Age
      const diff = DateDifferenceCalculator.calculate(s, e);

      // Toggle Negative Notice
      if (diff.isNegative) {
        this.negativeNotice.classList.remove('hidden');
      } else {
        this.negativeNotice.classList.add('hidden');
      }

      // Display Hero Numbers
      this.diffYears.textContent = diff.years;
      this.diffMonths.textContent = diff.months;
      this.diffDays.textContent = diff.days;

      // Display Summary Sentence in Traditional Chinese
      if (isZh) {
        const prefix = diff.isNegative ? '（反向）從 ' : '從 ';
        this.diffSummarySentence.innerHTML = `${prefix}<strong>${s.year}年${sMStr}月${sDStr}日</strong> 到 <strong>${e.year}年${eMStr}月${eDStr}日</strong>，共相差 <strong>${diff.years} 年 ${diff.months} 個月 ${diff.days} 天</strong>（年齡周歲：<strong>${diff.years}</strong> 歲）。`;
      } else {
        const prefix = diff.isNegative ? '(Reversed) From ' : 'From ';
        this.diffSummarySentence.innerHTML = `${prefix}<strong>${s.year}-${sMStr}-${sDStr}</strong> to <strong>${e.year}-${eMStr}-${eDStr}</strong> is <strong>${diff.years} years, ${diff.months} months, and ${diff.days} days</strong> (Age: <strong>${diff.years}</strong> full years).`;
      }

      // 4. Update Breakdown Units
      this.totalDaysVal.textContent = diff.totalDays.toLocaleString();
      this.totalWeeksVal.textContent = isZh ? `${diff.totalWeeks.toLocaleString()} 週 ${diff.remDaysInWeek} 天` : `${diff.totalWeeks.toLocaleString()} wks, ${diff.remDaysInWeek} d`;
      this.totalMonthsVal.textContent = isZh ? `${diff.totalMonthsApprox.toLocaleString()} 個月 ${diff.days} 天` : `${diff.totalMonthsApprox.toLocaleString()} mos, ${diff.days} d`;
      this.totalHoursVal.textContent = diff.totalHours.toLocaleString();
      this.totalMinutesVal.textContent = diff.totalMinutes.toLocaleString();
      this.totalWorkdaysVal.textContent = diff.workdays.toLocaleString();

      // 5. Update Birthday & Milestones
      this.updateMilestones(s, e, diff);
    }

    updateMilestones(s, e, diff) {
      const isZh = this.currentLang === 'zh';

      // Next Birthday calculation based on Target End Date
      let nextBdayYear = e.year;
      let bdayDaysInMonth = getDaysInMonth(nextBdayYear, s.month);
      let targetBdayDay = Math.min(s.day, bdayDaysInMonth);
      let nextBdayDate = new Date(nextBdayYear, s.month - 1, targetBdayDay);
      const targetEndDate = new Date(e.year, e.month - 1, e.day);

      if (nextBdayDate < targetEndDate) {
        nextBdayYear += 1;
        bdayDaysInMonth = getDaysInMonth(nextBdayYear, s.month);
        targetBdayDay = Math.min(s.day, bdayDaysInMonth);
        nextBdayDate = new Date(nextBdayYear, s.month - 1, targetBdayDay);
      }

      const daysToBday = Math.round((nextBdayDate - targetEndDate) / (1000 * 60 * 60 * 24));
      const turningAge = nextBdayYear - s.year;

      if (daysToBday === 0) {
        this.nextBdayCountdown.textContent = isZh ? '🎉 今天就是生日！' : '🎉 Today is the birthday!';
      } else {
        this.nextBdayCountdown.textContent = isZh ? `還有 ${daysToBday} 天` : `In ${daysToBday} days`;
      }

      const bdayMStr = String(s.month).padStart(2, '0');
      const bdayDStr = String(targetBdayDay).padStart(2, '0');
      this.nextBdayDate.textContent = isZh
        ? `目標日：${nextBdayYear}年${bdayMStr}月${bdayDStr}日 (${turningAge} 歲生日)`
        : `Date: ${nextBdayYear}-${bdayMStr}-${bdayDStr} (${turningAge}th Birthday)`;

      // Birthday annual progress
      const yearStart = new Date(nextBdayYear - 1, s.month - 1, targetBdayDay);
      const totalYearMs = nextBdayDate - yearStart;
      const passedMs = targetEndDate - yearStart;
      let progressPercent = totalYearMs > 0 ? Math.round((passedMs / totalYearMs) * 100) : 0;
      progressPercent = clamp(progressPercent, 0, 100);

      this.bdayProgressFill.style.width = `${progressPercent}%`;
      this.bdayProgressNote.textContent = isZh
        ? `當前歲數進度：已過 ${progressPercent}%`
        : `Age cycle progress: ${progressPercent}%`;

      // 10,000 Days Milestone
      const startDateObj = new Date(s.year, s.month - 1, s.day);
      const tenThousandDateObj = new Date(startDateObj);
      tenThousandDateObj.setDate(tenThousandDateObj.getDate() + 10000);

      const ttY = tenThousandDateObj.getFullYear();
      const ttM = String(tenThousandDateObj.getMonth() + 1).padStart(2, '0');
      const ttD = String(tenThousandDateObj.getDate()).padStart(2, '0');
      this.tenThousandDate.textContent = isZh ? `${ttY}年${ttM}月${ttD}日` : `${ttY}-${ttM}-${ttD}`;

      const daysTo10k = Math.round((tenThousandDateObj - targetEndDate) / (1000 * 60 * 60 * 24));
      if (daysTo10k > 0) {
        this.tenThousandStatus.textContent = isZh ? `距此里程碑還有 ${daysTo10k.toLocaleString()} 天` : `${daysTo10k.toLocaleString()} days remaining`;
      } else if (daysTo10k === 0) {
        this.tenThousandStatus.textContent = isZh ? `🌟 今天恰好是第 10,000 天！` : `🌟 Today is the 10,000th day!`;
      } else {
        this.tenThousandStatus.textContent = isZh ? `已於 ${Math.abs(daysTo10k).toLocaleString()} 天前達成` : `Achieved ${Math.abs(daysTo10k).toLocaleString()} days ago`;
      }

      // 18th Birthday Adult Milestone
      const adultYear = s.year + 18;
      const adultDaysInM = getDaysInMonth(adultYear, s.month);
      const adultDay = Math.min(s.day, adultDaysInM);
      const adultDateObj = new Date(adultYear, s.month - 1, adultDay);

      const adY = adultDateObj.getFullYear();
      const adM = String(adultDateObj.getMonth() + 1).padStart(2, '0');
      const adD = String(adultDateObj.getDate()).padStart(2, '0');
      this.adultDate.textContent = isZh ? `${adY}年${adM}月${adD}日` : `${adY}-${adM}-${adD}`;

      const daysToAdult = Math.round((adultDateObj - targetEndDate) / (1000 * 60 * 60 * 24));
      if (daysToAdult > 0) {
        this.adultStatus.textContent = isZh ? `距成年禮還有 ${daysToAdult.toLocaleString()} 天` : `${daysToAdult.toLocaleString()} days until adult`;
      } else if (daysToAdult === 0) {
        this.adultStatus.textContent = isZh ? `🎂 目標日當天滿 18 歲成年！` : `🎂 Turns 18 on this target day!`;
      } else {
        const yearsAgo = Math.floor(Math.abs(daysToAdult) / 365.25);
        this.adultStatus.textContent = isZh ? `已於 ${yearsAgo} 年前滿 18 歲` : `Turned 18 about ${yearsAgo} years ago`;
      }
    }

    copyResultToClipboard() {
      const s = this.startPicker.getDate();
      const e = this.endPicker.getDate();
      const diff = DateDifferenceCalculator.calculate(s, e);
      const isZh = this.currentLang === 'zh';

      const sMStr = String(s.month).padStart(2, '0');
      const sDStr = String(s.day).padStart(2, '0');
      const eMStr = String(e.month).padStart(2, '0');
      const eDStr = String(e.day).padStart(2, '0');

      let text = '';
      if (isZh) {
        text = `【日期差與年齡計算結果】\n` +
               `起始日期：${s.year}年${sMStr}月${sDStr}日\n` +
               `結束日期：${e.year}年${eMStr}月${eDStr}日\n` +
               `計算結果：${diff.years} 年 ${diff.months} 個月 ${diff.days} 天（周歲：${diff.years} 歲）\n` +
               `總天數：${diff.totalDays.toLocaleString()} 天\n` +
               `總週數：${diff.totalWeeks.toLocaleString()} 週 ${diff.remDaysInWeek} 天\n` +
               `累計小時：${diff.totalHours.toLocaleString()} 小時`;
      } else {
        text = `[Date Difference & Age Result]\n` +
               `Start Date: ${s.year}-${sMStr}-${sDStr}\n` +
               `End Date: ${e.year}-${eMStr}-${eDStr}\n` +
               `Difference: ${diff.years} years, ${diff.months} months, ${diff.days} days (Age: ${diff.years})\n` +
               `Total Days: ${diff.totalDays.toLocaleString()} days\n` +
               `Total Weeks: ${diff.totalWeeks.toLocaleString()} weeks, ${diff.remDaysInWeek} days\n` +
               `Total Hours: ${diff.totalHours.toLocaleString()} hours`;
      }

      navigator.clipboard.writeText(text).then(() => {
        this.showToast(isZh ? '✅ 計算結果已複製到剪貼簿！' : '✅ Result copied to clipboard!');
      }).catch(() => {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        this.showToast(isZh ? '✅ 計算結果已複製到剪貼簿！' : '✅ Result copied to clipboard!');
      });
    }

    showToast(msg) {
      if (!this.toastEl) return;
      this.toastEl.textContent = msg;
      this.toastEl.classList.add('show');
      clearTimeout(this.toastTimer);
      this.toastTimer = setTimeout(() => {
        this.toastEl.classList.remove('show');
      }, 2400);
    }
  }

  // Initialize once DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.app = new AppController();
    });
  } else {
    window.app = new AppController();
  }
})();
