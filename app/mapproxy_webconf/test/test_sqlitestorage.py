import os
from mapproxy_webconf.storage import SQLiteStore
from mapproxy_webconf.test.helper import TempDirTest
import sqlite3
import pytest

class TestSQLiteStorage(TempDirTest):
    def setup(self):
        TempDirTest.setup(self)
        self.storage = SQLiteStore(os.path.join(self.tmp_dir, 'test.sqlite'))

    def test_get_non_existent_section(self):
        assert self.storage.get_all('sources', 'base') == {}

    def test_get_non_existent_elem(self):
        assert self.storage.get(1, 'sources', 'base') == None

    def test_add_update_get(self):
        new_id = self.storage.add(section='sources', project='base', data={'data': {'foo': 'bar'}})
        assert self.storage.get_all(section='sources', project='base') == {new_id: {'data':{'foo': 'bar'}}}

        self.storage.update(id=new_id, section='sources', project='base', data={'data': {'foo': 'baz'}})
        assert self.storage.get_all(section='sources', project='base') == {new_id: {'data': {'foo': 'baz'}}}

    def test_add_invalid_parent(self):
        with pytest.raises(sqlite3.IntegrityError):
            self.storage.add(section='sources', project='base', data={'data': {'foo': 'bar'}, '_parent': 99})

    def test_get_with_rank(self):
        parent = self.storage.add(section='sources', project='base', data={'data': {'foo': 'bar'}, '_rank': 10})
        assert (self.storage.get_all(section='sources', project='base', with_rank=True)
            == {parent: {'data': {'foo': 'bar'}, '_parent': None, '_rank': 10}})
        child = self.storage.add(section='sources', project='base', data={'data': {'foo': 'baz'}, '_parent': parent, '_rank': 5})
        assert (self.storage.get_all(section='sources', project='base', with_rank=True)
            == {
                parent: {'data': {'foo': 'bar'}, '_parent': None, '_rank': 10},
                child: {'data': {'foo': 'baz'}, '_parent': parent, '_rank': 5}
            }
        )

    def test_get_with_id(self):
        new_id = self.storage.add(section='sources', project='base', data={'data': {'foo': 'bar'}})
        assert self.storage.get_all(section='sources', project='base', with_id=True) == {new_id: {'_id': new_id, 'data': {'foo': 'bar'}}}

        self.storage.update(id=new_id, section='sources', project='base', data={'data': {'foo': 'baz'}})
        assert self.storage.get_all(section='sources', project='base', with_id=True) == {new_id: {'_id': new_id, 'data': {'foo': 'baz'}}}

    def test_dependencies(self):
        source_id = self.storage.add(section='sources', project='base', data={'data': {'name': 'foo_source'}})
        assert self.storage.get_all(section='sources', project='base', with_id=True) == {source_id: {'_id': source_id, 'data': {'name': 'foo_source'}}}

        layer_id = self.storage.add(section='layers', project='base', data={'data': {'name': 'foo_layer', 'sources': [source_id]}})
        assert self.storage.get_all(section='layers', project='base', with_id=True) == {layer_id: {'_id': layer_id, 'data': {'name': 'foo_layer', 'sources': [source_id]}}}

        result = self.storage.check_dependencies(id=source_id, project='base', look_for={'layers': 'sources'})
        assert result == {'layers': [{'name': 'foo_layer'}]}
