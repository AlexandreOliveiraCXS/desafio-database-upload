import Transaction from '../models/Transaction';
import TransactionsRepository from '../repositories/TransactionsRepository';

import CategoryRepository from '../repositories/CategoryRepository';

import { getCustomRepository, In, Index } from 'typeorm';

import csvParse from 'csv-parse';
import fs from 'fs';
import Category from '../models/Category';

interface CSVTransactions {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

class ImportTransactionsService {
  async execute(filePath: string): Promise<Transaction[]> {
    const categoryRepository = getCustomRepository(CategoryRepository);
    const transactionRepository = getCustomRepository(TransactionsRepository);

    const contactsReadStream = fs.createReadStream(filePath);

    const parsers = csvParse({
      delimiter: ',',
      from_line: 2,
    });

    const parseCSV = contactsReadStream.pipe(parsers);

    const transactions: CSVTransactions[] = [];
    const categories: string[] = [];

    parseCSV.on('data', async line => {
      const [title, type, value, category] = line.map((cell: String) =>
        cell.trim(),
      );

      if (!title || !type || !value) return;

      categories.push(category);
      transactions.push({ title, type, value, category });
    });

    await new Promise(resolve => parseCSV.on('end', resolve));

    const existentCategories = await categoryRepository.find({
      where: {
        title: In(categories),
      },
    });

    const existentTitleCategories = existentCategories.map(
      (category: Category) => category.title,
    );

    const addTitleCategories = categories
      .filter(category => !existentTitleCategories.includes(category))
      .filter((value, index, self) => self.indexOf(value) === index);

    const newCategories = categoryRepository.create(
      addTitleCategories.map(title => ({
        title,
      })),
    );

    await categoryRepository.save(newCategories);

    const allCategories = [...newCategories, ...existentCategories];

    const createTransactions = transactionRepository.create(
      transactions.map(transaction => ({
        title: transaction.title,
        type: transaction.type,
        value: transaction.value,
        category: allCategories.find(
          category => category.title === transaction.category,
        ),
      })),
    );

    const transactionSaved = await transactionRepository.save(createTransactions);

    await fs.promises.unlink(filePath);

    return transactionSaved;
  }
}

export default ImportTransactionsService;
