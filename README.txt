Backup Command:
pg_dump -U postgres -h localhost -p 5432 -d timebank -F c -b -v -f timebank_backup.backup

Restore Command:
createdb -U postgres -h localhost -p 5432 timebank
pg_restore -U postgres -h localhost -p 5432 -d timebank -v timebank_backup.backup