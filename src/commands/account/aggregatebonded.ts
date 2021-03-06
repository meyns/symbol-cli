/*
 *
 * Copyright 2018-present NEM
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
import { command, metadata } from 'clime';

import { AccountTransactionsCommand, AccountTransactionsOptions } from '../../interfaces/account.transactions.command';
import { AddressResolver } from '../../resolvers/address.resolver';
import { FormatterService } from '../../services/formatter.service';
import { TransactionView } from '../../views/transactions/details/transaction.view';

@command({
    description: 'Fetch aggregate bonded transactions from account',
})
export default class extends AccountTransactionsCommand {
    constructor() {
        super();
    }

    @metadata
    async execute(options: AccountTransactionsOptions) {
        const profile = this.getProfile(options);
        const address = await new AddressResolver().resolve(options, profile);

        this.spinner.start();
        const accountHttp = profile.repositoryFactory.createAccountRepository();
        accountHttp.getAccountPartialTransactions(address, options.getQueryParams()).subscribe(
            (transactions) => {
                this.spinner.stop();
                transactions.forEach((transaction) => {
                    new TransactionView(transaction).print();
                });

                if (!transactions.length) {
                    console.log(FormatterService.error("There aren't aggregate bonded transaction"));
                }
            },
            (err) => {
                this.spinner.stop();
                console.log(FormatterService.error(err));
            },
        );
    }
}
