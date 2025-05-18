import { describe, it, expect } from 'vitest';
import { User, UserRole } from '../../../../domain/entities/User';

describe('User Entity', () => {
  it('should create a User instance with the provided properties', () => {
    // 준비
    const id = '123';
    const username = 'testuser';
    const email = 'test@example.com';
    const password = 'hashedpassword';
    const role = UserRole.USER;

    // 실행
    const user = new User(id, username, email, password, role);

    // 검증
    expect(user.id).toBe(id);
    expect(user.username).toBe(username);
    expect(user.email).toBe(email);
    expect(user.password).toBe(password);
    expect(user.role).toBe(role);
  });

  it('should create an admin User instance', () => {
    // 준비
    const id = '456';
    const username = 'adminuser';
    const email = 'admin@example.com';
    const password = 'adminpassword';
    const role = UserRole.ADMIN;

    // 실행
    const user = new User(id, username, email, password, role);

    // 검증
    expect(user.id).toBe(id);
    expect(user.username).toBe(username);
    expect(user.email).toBe(email);
    expect(user.password).toBe(password);
    expect(user.role).toBe(role);
  });
});