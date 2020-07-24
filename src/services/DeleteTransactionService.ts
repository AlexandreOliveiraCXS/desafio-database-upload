import TransactionsRepository from '../repositories/TransactionsRepository';
import { getCustomRepository } from 'typeorm';
import AppError from '../errors/AppError';

interface Request {
  id: string;
}
class DeleteTransactionService {
  public async execute({ id }: Request): Promise<void> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);

    const transaction = await transactionsRepository.findOne(id);
    if (!transaction) {
      throw new AppError('Transaction is not found');
    }

    await transactionsRepository.remove(transaction);
  }
}

export default DeleteTransactionService;
