import moment from 'moment';
import { dateRegex } from './regex';

export default function validateDate(date: string | any): string | null {
	if (typeof date !== 'string') return null;
	if (!date.match(dateRegex)) {
		return null;
	}
	if (!moment(date).isValid()) return null;

	return date;
}
