import passport from 'passport';
import { User as AppUser } from '../types';
declare global {
    namespace Express {
        interface User extends AppUser {
        }
    }
}
export default passport;
