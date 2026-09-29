import { HttpError } from '@/lib/api';
import { myShareOf } from '@/lib/splits';

/** For split bills the server decides the amount: it is always my share of the total */
export function normalizeSplit(body, existingType) {
  if (!body.split) return body;
  if ((body.type || existingType) === 'income') throw new HttpError(400, 'Only expenses can be split');
  return { ...body, amount: myShareOf(body.split) };
}
