import { Input } from './Input';

const getDigits = (value) => String(value ?? '').replace(/\D/g, '');

const formatRupiahInput = (value) => {
  const digits = getDigits(value);
  if (!digits) return '';
  return new Intl.NumberFormat('id-ID').format(Number(digits));
};

export function CurrencyInput({ value, onChange, ...props }) {
  return (
    <Input
      {...props}
      type="text"
      inputMode="numeric"
      value={formatRupiahInput(value)}
      onChange={(event) => {
        onChange?.({
          ...event,
          target: {
            ...event.target,
            value: getDigits(event.target.value),
          },
        });
      }}
    />
  );
}
