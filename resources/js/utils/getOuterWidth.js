/*
 * Outer Width With Margin
 */
export const getOuterWidth = el => {
  // let width = el.offsetWidth;
  let width = parseFloat(getComputedStyle(el).getPropertyValue('width'));
  const style = getComputedStyle(el);
  width += parseInt(style.marginLeft) + parseInt(style.marginRight);
  return width;
};

export const getMargin = el => {
  const style = getComputedStyle(el);

  return parseInt(style.marginLeft);
};
