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
import { command, metadata, option } from 'clime';
import { filter, flatMap, switchMap, tap } from 'rxjs/operators';
import { Address, AggregateTransaction, CosignatureSignedTransaction, CosignatureTransaction, QueryParams } from 'symbol-sdk';

import { AnnounceTransactionsOptions } from '../../interfaces/announceTransactions.options';
import { ProfileCommand } from '../../interfaces/profile.command';
import { Profile } from '../../models/profile.model';
import { HashResolver } from '../../resolvers/hash.resolver';
import { PasswordResolver } from '../../resolvers/password.resolver';
import { FormatterService } from '../../services/formatter.service';
import { MultisigService } from '../../services/multisig.service';
import { SequentialFetcher } from '../../services/sequentialFetcher.service';
import { TransactionView } from '../../views/transactions/details/transaction.view';

export class CommandOptions extends AnnounceTransactionsOptions {
    @option({
        flag: 'h',
        description: 'Aggregate bonded transaction hash to be signed.',
    })
    hash: string;
}

@command({
    description: 'Cosign an aggregate bonded transaction',
})
export default class extends ProfileCommand {
    private profile: Profile;
    private options: CommandOptions;

    constructor() {
        super();
    }

    @metadata
    async execute(options: CommandOptions) {
        this.options = options;
        this.profile = this.getProfile(this.options);

        const hash = await new HashResolver().resolve(options, "'Enter the aggregate bonded transaction hash to cosign: ");

        this.spinner.start();
        const sequentialFetcher = this.getSequentialFetcher();

        new MultisigService(this.profile)
            .getSelfAndChildrenAddresses()
            .pipe(
                switchMap((addresses) => sequentialFetcher.getResults(addresses)),
                flatMap((transaction: AggregateTransaction[]) => transaction),
                filter((_) => _.transactionInfo !== undefined && _.transactionInfo.hash !== undefined && _.transactionInfo.hash === hash),
                tap((transaction) => {
                    console.log(FormatterService.title('Transaction to cosign:'));
                    new TransactionView(transaction).print();
                }),
            )
            .subscribe(
                async (transaction: AggregateTransaction) => {
                    sequentialFetcher.kill();
                    const signedCosignature = await this.getSignedAggregateBondedCosignature(transaction, hash);
                    if (signedCosignature) {
                        this.announceAggregateBondedCosignature(signedCosignature);
                    }
                },
                (err) => {
                    this.spinner.stop();
                    console.log(FormatterService.error(err));
                },
            );
    }

    /**
     * Creates a sequential fetcher instance loaded with a getAccountPartialTransactions function
     * @private
     * @returns {SequentialFetcher}
     */
    private getSequentialFetcher(): SequentialFetcher {
        const queryParams = new QueryParams({ pageSize: 100 });
        const networkCall = (address: Address) =>
            this.profile.repositoryFactory.createAccountRepository().getAccountPartialTransactions(address, queryParams).toPromise();

        return SequentialFetcher.create(networkCall);
    }

    /**
     * Attempts to cosign an aggregated transaction cosignature
     * @private
     * @param {AggregateTransaction} transaction
     * @param {string} hash of the transaction to be cosigned
     * @returns {(CosignatureSignedTransaction | null)}
     */
    private async getSignedAggregateBondedCosignature(
        transaction: AggregateTransaction,
        hash: string,
    ): Promise<CosignatureSignedTransaction | null> {
        try {
            const cosignatureTransaction = CosignatureTransaction.create(transaction);
            this.spinner.stop();
            const password = await new PasswordResolver().resolve(this.options);
            this.spinner.start();
            const account = this.profile.decrypt(password);
            return account.signCosignatureTransaction(cosignatureTransaction);
        } catch (err) {
            this.spinner.stop();
            console.log(FormatterService.error('The profile ' + this.profile.name + ' cannot cosign the transaction with hash ' + hash));
            return null;
        }
    }

    /**
     * Announces aggregate bonded cosignature
     * @private
     * @param {CosignatureSignedTransaction} signedCosignature
     * @returns {Promise<void>}
     */
    private async announceAggregateBondedCosignature(signedCosignature: CosignatureSignedTransaction): Promise<void> {
        try {
            await this.profile.repositoryFactory
                .createTransactionRepository()
                .announceAggregateBondedCosignature(signedCosignature)
                .toPromise();
            this.spinner.stop();
            console.log(FormatterService.success('Transaction cosigned and announced correctly'));
        } catch (err) {
            this.spinner.stop();
            console.log(FormatterService.error(err));
        }
    }
}
