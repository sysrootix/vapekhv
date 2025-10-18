export const MIN_ORDER_AMOUNT = 1000;

export const DELIVERY_STEPS = [
  { threshold: MIN_ORDER_AMOUNT, cost: 500, label: 'Доставка за 500₽' },
  { threshold: 3000, cost: 300, label: 'Доставка за 300₽' },
  { threshold: 4000, cost: 200, label: 'Доставка за 200₽' },
  { threshold: 5000, cost: 0, label: 'Бесплатная доставка' },
] as const;

export type DeliveryStep = (typeof DELIVERY_STEPS)[number];

export const calculateDeliveryCost = (subtotal: number): number => {
  for (let i = DELIVERY_STEPS.length - 1; i >= 0; i -= 1) {
    if (subtotal >= DELIVERY_STEPS[i].threshold) {
      return DELIVERY_STEPS[i].cost;
    }
  }
  return DELIVERY_STEPS[0].cost;
};

export const getDeliveryProgress = (subtotal: number) => {
  const minOrderReached = subtotal >= MIN_ORDER_AMOUNT;
  const currentStep =
    DELIVERY_STEPS.slice()
      .reverse()
      .find((step) => subtotal >= step.threshold) ?? null;
  const nextStep = DELIVERY_STEPS.find((step) => subtotal < step.threshold) ?? null;

  let progressPercent = 1;
  if (!minOrderReached) {
    progressPercent = Math.min(1, subtotal / MIN_ORDER_AMOUNT);
  } else if (nextStep && currentStep) {
    const segmentStart = currentStep.threshold;
    const segmentEnd = nextStep.threshold;
    progressPercent = (subtotal - segmentStart) / (segmentEnd - segmentStart);
  }

  return {
    minOrderReached,
    currentStep,
    nextStep,
    progressPercent: Math.max(0, Math.min(1, progressPercent)),
    amountToNext: nextStep ? Math.max(0, nextStep.threshold - subtotal) : 0,
  };
};
