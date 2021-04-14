import events from 'events';
import velocity from 'velocity-animate';

import enablePassiveEventListeners from '../../utils/enablePassiveEventListeners';
import { getOuterWidth, getMargin } from '../../utils/getOuterWidth';

/**
 * translateXの値を取得
 * @param {*} $el
 */
const getTranslateX = $el => {
  const style = $el.style;
  const transforms =
    style.transform || style.webkitTransform || style.mozTransform;

  const str = String(transforms).split('translateX(')[1];
  let translateX = String(str).split('px)')[0];

  if (translateX === 'undefined') {
    translateX = 0;
  } else {
    translateX = translateX;
  }
  return translateX;
};

/**
 * カルーセル(velocity用)
 * 要件
 * 進むボタン、戻るボタン
 * スワイプ
 * アクティビティインジケーター（ページャー）3/5 サムネイル
 * 自動スライド
 * リサイズ
 */
export default class CarouselUI extends events {
  /**
   * @param selector
   */
  constructor(selector, options = {}) {
    super();
    this.$el = document.querySelector(selector);
    if (!this.$el) return;
    this.$wrapper = this.$el.querySelector(`.js-carousel-wrap`);
    this.$items = this.$el.querySelectorAll(`.js-carousel-item`);
    this.$prev = this.$el.querySelector(`.js-button-preview`);
    this.$next = this.$el.querySelector(`.js-button-next`);
    this.$dots = this.$el.querySelectorAll(`.js-carousel-dots li`);
    this.$firstItem = this.$el.querySelector(`.js-carousel-item:first-child`);
    this.$lastItem = this.$el.querySelector(`.js-carousel-item:last-child`);
    this.$body = document.body;

    this.threshold = 5;

    this.currentIndex = 0;
    this.length = this.$items.length;
    this.unitWidth = 0;

    this.duration = options.duration || 300;
    this.easing = options.easing || 'easeOutQuad';

    this.isFixed = false;
    this.touched = false;
    this.offsetX = 0;
    this.lastDiffX = 0;

    this.translateX = 0;
    this.scroll = 0;

    this.classes = {
      active: 'current',
    };
    this.directions = {
      default: 0,
      left: 1,
      right: 2,
    };

    this.startTranslateX = 0;
    this.lastClientX = 0;
    this.lastClientY = 0;
    this.lastTranslateX = 0;
    this.velocityX = 0;

    this.margin = 0;

    this.update();
    this.bind();
  }

  /**
   * wrapperを元に戻す
   * @param {*} translateX
   */
  relocateWrapper(translateX) {
    velocity(this.$wrapper, 'stop');
    velocity(
      this.$wrapper,
      {
        translateX,
      },
      {
        duration: 0,
        mobileHA: false,
      }
    );
    this.translateX = translateX;
  }

  /**
   * カルーセルの最後の要素を先頭に持ってくる
   */
  relocateLastItem() {
    velocity(this.$lastItem, 'stop');
    velocity(
      this.$lastItem,
      {
        translateX: -this.unitWidth * this.length,
      },
      {
        duration: 0,
        mobileHA: false,
      }
    );
  }

  /**
   * カルーセルの最初の要素を最後に持ってくる
   */
  relocateFirstItem() {
    velocity(this.$firstItem, 'stop');
    velocity(
      this.$firstItem,
      {
        translateX: this.unitWidth * this.length,
      },
      {
        duration: 0,
        mobileHA: false,
      }
    );
  }

  /**
   * カルーセルの最後の要素を元の位置に戻す
   */
  resetLastItem() {
    // velocity(this.$lastItem, 'stop');
    velocity(
      this.$lastItem,
      {
        translateX: 0,
      },
      {
        duration: 0,
        mobileHA: false,
      }
    );
  }

  /**
   * カルーセルの最初の要素を元の位置に戻す
   */
  resetFirstItem() {
    velocity(
      this.$firstItem,
      {
        translateX: 0,
      },
      {
        duration: 0,
        mobileHA: false,
      }
    );
  }

  /**
   * 更新
   */
  update() {
    this.unitWidth = getOuterWidth(this.$items[0]);
    this.margin =
      (window.innerWidth - this.unitWidth - getMargin(this.$items[0])) / 2;
  }

  /**
   * イベントまとめたやつ
   */
  bind() {
    const options = enablePassiveEventListeners() ? { passive: true } : false;

    window.addEventListener('load', this.handleLoad.bind(this), options);
    window.addEventListener('resize', this.handleResize.bind(this), options);
    this.$next.addEventListener('click', this.handleClickNext.bind(this), {
      passive: false,
    });
    this.$prev.addEventListener('click', this.handleClickPrev.bind(this), {
      passive: false,
    });
    [...this.$dots].forEach(($dot, dotIndex) => {
      $dot.addEventListener(
        'click',
        e => {
          e.preventDefault();
          this.goTo(dotIndex);
        },
        { passive: false }
      );
    });
    this.$el.addEventListener(
      'touchstart',
      this.handleSwipeStart.bind(this),
      options
    );
    this.$el.addEventListener(
      'touchmove',
      this.handleSwipeMove.bind(this),
      options
    );
    document.body.addEventListener(
      'touchend',
      this.handleSwipeEnd.bind(this),
      options
    );
    this.$el.addEventListener(
      'mousedown',
      this.handleSwipeStart.bind(this),
      options
    );
    this.$el.addEventListener(
      'mousemove',
      this.handleSwipeMove.bind(this),
      options
    );
    this.$el.addEventListener(
      'mouseleave',
      this.handleSwipeEnd.bind(this),
      options
    );
    document.body.addEventListener(
      'mouseup',
      this.handleSwipeEnd.bind(this),
      options
    );
  }

  /**
   * 次に行くボタンを押した時
   * @param {*} event
   */
  handleClickNext(event) {
    event.stopImmediatePropagation();
    event.preventDefault();
    this.next();
  }

  /**
   * 前に戻るボタンを押した時
   * @param {*} event
   */
  handleClickPrev(event) {
    event.stopImmediatePropagation();
    event.preventDefault();
    this.prev();
  }

  /**
   * 画面をタッチした時
   * @param {*} event
   */
  handleSwipeStart(event) {
    this.lastClientX =
      event.type === 'touchstart' ? event.touches[0].clientX : event.clientX;
    this.lastClientY =
      event.type === 'touchstart' ? event.touches[0].clientY : event.clientY;
    this.startTranslateX = parseFloat(getTranslateX(this.$wrapper));
    this.lastTranslateX = this.startTranslateX;
    this.offsetX = 0;
    this.touched = true;
    this.lastDiffX = 0;
    this.velocityX = 0;
  }

  /**
   * ロードが終わった時に実行
   */
  handleLoad() {
    this.update();
    this.updateItem();
  }

  /**
   * リサイズ時に実行
   */
  handleResize() {
    this.update();
    this.translateX = -this.unitWidth * this.currentIndex;
    velocity(
      this.$wrapper,
      {
        translateX: this.translateX,
      },
      {
        duration: 0,
        mobileHA: false,
      }
    );
    this.updateItem();
  }

  /**
   * スワイプ中に実行
   * @param {*} event
   */
  handleSwipeMove(event) {
    if (this.touched === false) return;
    // event.preventDefault();

    const clientX =
      event.type === 'touchmove' ? event.touches[0].clientX : event.clientX;
    const clientY =
      event.type === 'touchmove' ? event.touches[0].clientY : event.clientY;

    const diffY = clientY - this.lastClientY;
    const diffX = clientX - this.lastClientX;
    const moveRate = diffX / diffY;
    if (moveRate > Math.tan((15 * Math.PI) / 180)) {
      if (event.cancelable) event.preventDefault();
    }

    this.lastTranslateX = this.lastTranslateX + diffX;
    this.translateX = this.lastTranslateX;
    velocity(this.$wrapper, 'stop');
    velocity(
      this.$wrapper,
      {
        translateX: this.lastTranslateX,
      },
      {
        duration: 0,
        mobileHA: false,
      }
    );

    // update last clientX
    this.lastClientX = clientX;
    this.velocityX = diffX;

    this.updateItem();
  }

  /**
   * スワイプが終わった時に実行
   */
  handleSwipeEnd() {
    if (this.touched === false) return;
    this.touched = false;

    const diffX = this.lastTranslateX - this.startTranslateX;

    const isFast = Math.abs(this.velocityX) > this.threshold;

    if (isFast) {
      diffX <= 0 ? this.next() : this.prev();
    } else if (diffX !== 0) {
      this.goTo(
        (Math.round(-this.lastTranslateX / this.unitWidth) + this.length) %
          this.length
      );
    }
  }

  /**
   * 次へ
   */
  next() {
    this.currentIndex =
      this.currentIndex < this.length - 1 ? this.currentIndex + 1 : 0;
    this.goTo(this.currentIndex, this.directions.right);
  }

  /**
   * 前へ
   */
  prev() {
    this.currentIndex =
      this.currentIndex <= 0 ? this.length - 1 : this.currentIndex - 1;
    this.goTo(this.currentIndex, this.directions.left);
  }

  /**
   * 特定の番号にジャンプ
   * @param {*} index
   */
  jump(index) {
    this.currentIndex = parseInt(index, 10);
    this.goTo(this.currentIndex, this.directions.default, 0);
  }

  /**
   * カルーセルを動かす
   * @param {*} index
   * @param {*} direction
   */
  goTo(index, direction = this.directions.default, duration) {
    this.currentIndex = index;

    let virtualIndex = this.currentIndex;

    if (
      direction === this.directions.left &&
      this.currentIndex === this.length - 1 &&
      this.virtualIndex > -1 &&
      this.virtualIndex < this.length / 2
    ) {
      virtualIndex = -1;
    }
    if (
      direction === this.directions.right &&
      this.currentIndex === 0 &&
      this.virtualIndex < this.length &&
      this.virtualIndex > this.length / 2
    ) {
      virtualIndex = this.length;
    }

    if (
      direction === this.directions.default &&
      this.currentIndex === this.length - 1 &&
      this.virtualIndex > -1 &&
      this.virtualIndex < this.length / 2
    ) {
      virtualIndex = -1;
    }

    if (
      direction === this.directions.default &&
      this.currentIndex === 0 &&
      this.virtualIndex < this.length &&
      this.virtualIndex > this.length / 2
    ) {
      virtualIndex = this.length;
    }

    [...this.$dots].forEach(($dot, dotIndex) => {
      dotIndex === this.currentIndex
        ? $dot.classList.add(this.classes.active)
        : $dot.classList.remove(this.classes.active);
    });

    const positionX = parseFloat(getTranslateX(this.$wrapper));

    velocity(this.$wrapper, 'stop');
    velocity(
      this.$wrapper,
      {
        tween: [-this.unitWidth * virtualIndex, positionX],
      },
      {
        easing: this.easing,
        duration: duration === 0 ? 0 : this.duration,
        mobileHA: false,
        progress: (a, b, c, d, e) => {
          a[0].style.transform = `translateX(${e}px)`;
          a[0].style.webkitTransform = `translateX(${e}px)`;
          this.translateX = e;
          if (e !== null) {
            this.translateX = parseFloat(getTranslateX(this.$wrapper));
            this.updateItem();
          }
        },
      }
    );

    this.resetActiveDots();
    this.activeDot();
  }

  // indexの値を見てwrapperの位置とitemの位置を移動させる
  updateItem() {
    if (this.translateX <= -this.unitWidth * this.length + this.margin) {
      this.relocateWrapper(
        this.translateX + (this.unitWidth * this.length - this.margin)
      );
    } else if (this.translateX >= this.unitWidth - this.margin) {
      this.relocateWrapper(this.translateX - this.unitWidth * this.length);
    }

    if (this.translateX >= -this.margin) {
      //最後の要素を左端に
      this.relocateLastItem();
    } else if (this.translateX < -this.margin) {
      //最後の要素を元の位置に
      this.resetLastItem();
    }
    if (this.translateX <= -this.unitWidth * (this.length - 2) + this.margin) {
      //最初の要素を右端に
      this.relocateFirstItem();
    } else if (
      this.translateX >
      -this.unitWidth * (this.length - 2) + this.margin
    ) {
      //最初の要素を元に戻す
      this.resetFirstItem();
    }
  }

  resetActiveDots() {
    [...this.$dots].forEach($dot => {
      if ($dot.classList.contains('is-active'))
        $dot.classList.remove('is-active');
    });
  }
  activeDot() {
    this.$dots[this.currentIndex].classList.add('is-active');
  }

  get virtualIndex() {
    return -this.translateX / this.unitWidth;
  }

  getCurrentIndex() {
    return this.currentIndex;
  }
}
