import AppError from '../errors/AppError';

import Transaction from '../models/Transaction';
import TransactionsRepository from '../repositories/TransactionsRepository';
import CategoryRepository from '../repositories/CategoryRepository';
import { getCustomRepository } from 'typeorm';

interface Request {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}

class CreateTransactionService {
  public async execute({
    title,
    value,
    type,
    category,
  }: Request): Promise<Transaction> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const categoryRepository = getCustomRepository(CategoryRepository);

    const transaction = transactionsRepository.create({
      title: title,
      value: value,
      type: type,
    });

    const {total} = await transactionsRepository.getBalance();

    if(type === 'outcome' && value > total)
      throw new AppError("You do not have enough balance");

    const findCategoryExistisTitle = await categoryRepository.findOne({
      where: { title:category },
    });

    if(!findCategoryExistisTitle){
      const categoryCreate = categoryRepository.create({title: category});

      const categorySave =  await categoryRepository.save(categoryCreate);

      transaction.category = categorySave;
    }else{
      transaction.category = findCategoryExistisTitle;
    }
    await transactionsRepository.save(transaction);

    return transaction;
  }
}

export default CreateTransactionService;
